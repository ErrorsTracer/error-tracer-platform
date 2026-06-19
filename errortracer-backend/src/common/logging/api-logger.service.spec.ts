import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ApiLoggerService,
  LogEntry,
  RotatingErrorFileTransport,
  createLoggerConfig,
  formatLogEntry,
} from './api-logger.service';

describe('ApiLoggerService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts sensitive headers and payload fields', () => {
    const logger = new ApiLoggerService({}, []);

    expect(
      logger.redact({
        authorization: 'Bearer token',
        cookie: 'sid=secret',
        password: 'secret',
        accessToken: 'access',
        refresh_token: 'refresh',
        apiKey: 'api-key',
        appKey: 'app-key',
        nested: {
          'x-api-key': 'nested-api-key',
          value: 'safe',
        },
      }),
    ).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      password: '[REDACTED]',
      accessToken: '[REDACTED]',
      refresh_token: '[REDACTED]',
      apiKey: '[REDACTED]',
      appKey: '[REDACTED]',
      nested: {
        'x-api-key': '[REDACTED]',
        value: 'safe',
      },
    });
  });

  it('formats logs as JSON in production by default', () => {
    const config = createLoggerConfig({ NODE_ENV: 'production' });
    const entry: LogEntry = {
      timestamp: '2026-05-12T00:00:00.000Z',
      level: 'info',
      requestId: 'request-1',
      message: 'http_request',
    };

    expect(config.format).toBe('json');
    expect(JSON.parse(formatLogEntry(entry, config.format))).toMatchObject({
      level: 'info',
      requestId: 'request-1',
      message: 'http_request',
    });
  });

  it('uses pretty logs outside production by default', () => {
    expect(createLoggerConfig({ NODE_ENV: 'development' }).format).toBe(
      'pretty',
    );
  });

  it('includes request ids and respects log level filtering', async () => {
    const entries: LogEntry[] = [];
    const logger = new ApiLoggerService({ level: 'warn', format: 'json' }, [
      {
        write: (entry) => {
          entries.push(entry);
        },
      },
    ]);

    logger.info('request-1', 'hidden');
    logger.warn('request-2', 'visible');
    await logger.flush();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 'warn',
      requestId: 'request-2',
      message: 'visible',
    });
  });

  it('writes only error logs to rotating files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'errortracer-logs-'));
    const logger = new ApiLoggerService(
      {
        level: 'debug',
        format: 'json',
        toFile: true,
        dir,
        errorFile: 'error.log',
        maxSizeBytes: 180,
        maxFiles: '2',
      },
      [
        new RotatingErrorFileTransport({
          level: 'debug',
          format: 'json',
          toFile: true,
          dir,
          errorFile: 'error.log',
          maxSizeBytes: 180,
          maxFiles: '2',
        }),
      ],
    );

    try {
      logger.warn('request-1', 'client_error');
      logger.error('request-2', 'server_error', new Error('boom'));
      logger.error('request-3', 'server_error_again', new Error('boom again'));
      await logger.flush();

      const files = readdirSync(dir);
      const logFiles = files.filter((file) => file.startsWith('error.log'));
      const currentLog = readFileSync(join(dir, 'error.log'), 'utf8');

      expect(logFiles.length).toBeGreaterThanOrEqual(1);
      expect(currentLog).toContain('"level":"error"');
      expect(currentLog).not.toContain('client_error');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
