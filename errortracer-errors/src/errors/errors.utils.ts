import { createHash } from 'crypto';
import { IngestErrorDto } from './errors.dto';

const SENSITIVE_KEYS = new Set(['authorization', 'cookie', 'password', 'token', 'accesstoken', 'refreshtoken', 'apikey', 'xapikey', 'secret']);
const REDACTED = '[Redacted]';

export function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_\s]/g, '')) ? REDACTED : sanitizeValue(item),
  ]));
}

export function generateErrorFingerprint(payload: IngestErrorDto, projectId: string, environment: string): string {
  const frame = payload.stack?.split('\n').map((line) => line.trim()).find((line) => /:\d+:\d+\)?$/.test(line));
  const location = frame?.replace(/^at\s+/, '').replace(/^.*\((.*)\)$/, '$1').replace(/:\d+:\d+\)?$/, '');
  const normalize = (value?: string) => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
  const source = [projectId, environment, payload.name, payload.message, location, payload.framework, payload.runtime]
    .map(normalize).join('|');
  return createHash('sha256').update(source).digest('hex');
}
