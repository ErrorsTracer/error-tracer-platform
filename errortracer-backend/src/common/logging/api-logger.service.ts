import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'fs';
import { appendFile } from 'fs/promises';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'pretty' | 'json';

export type RequestLogContext = {
  requestId: string;
  method: string;
  url: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
};

export type LoggerConfig = {
  level: LogLevel;
  format: LogFormat;
  toFile: boolean;
  dir: string;
  errorFile: string;
  maxSizeBytes: number;
  maxFiles: string;
};

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
};

export type LogTransport = {
  write(entry: LogEntry, formatted: string): void | Promise<void>;
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'access-token',
  'accesstoken',
  'access_token',
  'refresh-token',
  'refreshtoken',
  'refresh_token',
  'api-key',
  'apikey',
  'api_key',
  'app-key',
  'appkey',
  'app_key',
  'x-api-key',
]);

@Injectable()
export class ApiLoggerService {
  private readonly config: LoggerConfig;
  private readonly transports: LogTransport[];
  private pendingWrites: Promise<void>[] = [];

  constructor(config: Partial<LoggerConfig> = {}, transports?: LogTransport[]) {
    this.config = {
      ...createLoggerConfig(process.env),
      ...config,
    };
    this.transports = transports ?? createDefaultTransports(this.config);
  }

  async reportError(error: Error, context?: RequestLogContext) {
    // console.log({
    //   framework: 'nestjs',
    //   language: 'typescript',
    //   runtime: 'node',
    //   level: 'error',
    //   message: error.message,
    //   stack: error.stack,
    //   environment: process.env.NODE_ENV,
    // });

    await fetch(
      'http://localhost:4973/v0.1/errors/ingest',

      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ErrorTracer-Key': '2jyoiKh7iN0nZ8rmZnUbY7DP83',
        },
        body: JSON.stringify({
          url: context?.url,

          framework: 'nestjs',
          language: 'typescript',
          runtime: 'node',
          level: 'error',
          message: error.message,
          stack: error.stack,
          environment: process.env.NODE_ENV,
        }),
      },
    );
  }

  logRequest(context: RequestLogContext) {
    const level = this.getRequestLevel(context.statusCode);

    this.write({
      timestamp: new Date().toISOString(),
      level,
      requestId: context.requestId,
      message: 'http_request',
      context: sanitize({
        method: context.method,
        url: context.url,
        statusCode: context.statusCode,
        durationMs: context.durationMs,
        ip: context.ip,
        userAgent: context.userAgent,
      }) as Record<string, unknown>,
    });
  }

  logFailure(context: RequestLogContext, error: unknown, request?: Request) {
    const statusCode = context.statusCode ?? 500;

    this.write({
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'error' : 'warn',
      requestId: context.requestId,
      message: 'http_failure',
      context: sanitize({
        method: context.method,
        url: context.url,
        statusCode,
        durationMs: context.durationMs,
        ip: context.ip,
        userAgent: context.userAgent,
        headers: request?.headers,
        body: request?.body,
      }) as Record<string, unknown>,
      error: this.getError(error, statusCode >= 500),
    });
  }

  debug(requestId: string, message: string, context?: Record<string, unknown>) {
    this.write(this.createEntry('debug', requestId, message, context));
  }

  info(requestId: string, message: string, context?: Record<string, unknown>) {
    this.write(this.createEntry('info', requestId, message, context));
  }

  warn(requestId: string, message: string, context?: Record<string, unknown>) {
    this.write(this.createEntry('warn', requestId, message, context));
  }

  error(
    requestId: string,
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ) {
    this.write({
      ...this.createEntry('error', requestId, message, context),
      error: error === undefined ? undefined : this.getError(error, true),
    });
  }

  redact(value: unknown) {
    return sanitize(value);
  }

  async flush() {
    await Promise.all(this.pendingWrites);
    this.pendingWrites = [];
  }

  private createEntry(
    level: LogLevel,
    requestId: string,
    message: string,
    context?: Record<string, unknown>,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      message,
      context: sanitize(context) as Record<string, unknown> | undefined,
    };
  }

  private write(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = formatLogEntry(entry, this.config.format);

    for (const transport of this.transports) {
      const pendingWrite = Promise.resolve(
        transport.write(entry, formatted),
      ).catch((error) => {
        const fallback = formatLogEntry(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            requestId: entry.requestId,
            message: 'logger_transport_failure',
            error: this.getError(error, true),
          },
          'json',
        );

        process.stderr.write(`${fallback}\n`);
      });

      this.pendingWrites.push(pendingWrite);
    }
  }

  private shouldLog(level: LogLevel) {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.level];
  }

  private getRequestLevel(statusCode?: number): LogLevel {
    if ((statusCode ?? 0) >= 500) {
      return 'error';
    }

    if ((statusCode ?? 0) >= 400) {
      return 'warn';
    }

    return 'info';
  }

  private getError(error: unknown, includeStack: boolean): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: includeStack ? error.stack : undefined,
      };
    }

    return {
      message: typeof error === 'string' ? error : 'Unknown error',
    };
  }
}

export function createLoggerConfig(env: NodeJS.ProcessEnv): LoggerConfig {
  return {
    level: parseLogLevel(env.LOG_LEVEL),
    format: parseLogFormat(env.LOG_FORMAT, env.NODE_ENV),
    toFile: env.LOG_TO_FILE?.toLowerCase() === 'true',
    dir: env.LOG_DIR || 'logs',
    errorFile: env.LOG_ERROR_FILE || 'error.log',
    maxSizeBytes: parseSize(env.LOG_MAX_SIZE || '20m'),
    maxFiles: env.LOG_MAX_FILES || '14d',
  };
}

export function formatLogEntry(entry: LogEntry, format: LogFormat) {
  if (format === 'json') {
    return JSON.stringify(entry);
  }

  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const error = entry.error ? ` ${JSON.stringify(entry.error)}` : '';

  return `${entry.timestamp} ${entry.level.toUpperCase()} [${entry.requestId}] ${entry.message}${context}${error}`;
}

export function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? REDACTED : sanitize(item),
      ]),
    );
  }

  return value;
}

function createDefaultTransports(config: LoggerConfig): LogTransport[] {
  const transports: LogTransport[] = [new ConsoleTransport()];

  if (config.toFile) {
    transports.push(new RotatingErrorFileTransport(config));
  }

  return transports;
}

class ConsoleTransport implements LogTransport {
  write(entry: LogEntry, formatted: string) {
    const line = `${formatted}\n`;

    if (entry.level === 'error' || entry.level === 'warn') {
      process.stderr.write(line);
      return;
    }

    process.stdout.write(line);
  }
}

export class RotatingErrorFileTransport implements LogTransport {
  private readonly filePath: string;

  constructor(private readonly config: LoggerConfig) {
    this.filePath = join(config.dir, config.errorFile);
  }

  async write(entry: LogEntry, formatted: string) {
    if (entry.level !== 'error') {
      return;
    }

    this.ensureDirectory();
    this.rotateIfNeeded(Buffer.byteLength(`${formatted}\n`));
    await appendFile(this.filePath, `${formatted}\n`, 'utf8');
    this.enforceRetention();
  }

  private ensureDirectory() {
    if (!existsSync(this.config.dir)) {
      mkdirSync(this.config.dir, { recursive: true });
    }
  }

  private rotateIfNeeded(nextWriteBytes: number) {
    if (!existsSync(this.filePath)) {
      return;
    }

    const size = statSync(this.filePath).size;

    if (size + nextWriteBytes <= this.config.maxSizeBytes) {
      return;
    }

    const rotatedPath = join(
      this.config.dir,
      `${this.config.errorFile}.${new Date().toISOString().replace(/[:.]/g, '-')}`,
    );

    renameSync(this.filePath, rotatedPath);
  }

  private enforceRetention() {
    const rotatedFiles = readdirSync(this.config.dir)
      .filter((file) => file.startsWith(`${this.config.errorFile}.`))
      .map((file) => ({
        file,
        path: join(this.config.dir, file),
        mtimeMs: statSync(join(this.config.dir, file)).mtimeMs,
      }))
      .sort((left, right) => right.mtimeMs - left.mtimeMs);

    if (this.config.maxFiles.endsWith('d')) {
      const days = Number(this.config.maxFiles.slice(0, -1));
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      for (const file of rotatedFiles) {
        if (Number.isFinite(days) && file.mtimeMs < cutoff) {
          rmSync(file.path, { force: true });
        }
      }

      return;
    }

    const maxFiles = Number(this.config.maxFiles);

    if (!Number.isFinite(maxFiles)) {
      return;
    }

    for (const file of rotatedFiles.slice(maxFiles)) {
      rmSync(file.path, { force: true });
    }
  }
}

function parseLogLevel(value?: string): LogLevel {
  if (
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error'
  ) {
    return value;
  }

  return 'info';
}

function parseLogFormat(value?: string, nodeEnv?: string): LogFormat {
  if (value === 'pretty' || value === 'json') {
    return value;
  }

  return nodeEnv === 'production' ? 'json' : 'pretty';
}

function parseSize(value: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+)(b|k|kb|m|mb|g|gb)?$/);

  if (!match) {
    return 20 * 1024 * 1024;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'b';
  const multiplier =
    unit === 'g' || unit === 'gb'
      ? 1024 * 1024 * 1024
      : unit === 'm' || unit === 'mb'
        ? 1024 * 1024
        : unit === 'k' || unit === 'kb'
          ? 1024
          : 1;

  return amount * multiplier;
}

function isSensitiveKey(key: string) {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}
