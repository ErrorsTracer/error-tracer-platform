import { createHash } from 'crypto';
import { IngestErrorDto } from './errors.dto';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'xapikey',
  'secret',
]);

const REDACTED = '[Redacted]';

export function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitizeValue(item),
    ]),
  );
}

export function generateErrorFingerprint(
  payload: IngestErrorDto,
  projectId: string,
  environment: string,
): string {
  const source = [
    normalize(projectId),
    normalize(environment),
    normalize(payload.name),
    normalize(payload.message),
    normalize(getStackFrameLocation(payload.stack)),
    normalize(payload.framework),
    normalize(payload.runtime),
  ].join('|');

  return createHash('sha256').update(source).digest('hex');
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_\s]/g, ''));
}

function normalize(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getStackFrameLocation(stack?: string): string {
  if (!stack) {
    return '';
  }

  const frame = stack
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /:\d+:\d+\)?$/.test(line));

  if (!frame) {
    return '';
  }

  return frame
    .replace(/^at\s+/, '')
    .replace(/^.*\((.*)\)$/, '$1')
    .replace(/:\d+:\d+\)?$/, '');
}
