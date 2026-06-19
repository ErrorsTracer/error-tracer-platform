import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { clearInterval, clearTimeout, setInterval, setTimeout } from 'timers';
import { URL, URLSearchParams } from 'url';
import { TextDecoder, TextEncoder } from 'util';

if (!globalThis.setTimeout) {
  globalThis.setTimeout = setTimeout;
}

if (!globalThis.clearTimeout) {
  globalThis.clearTimeout = clearTimeout;
}

if (!globalThis.setInterval) {
  globalThis.setInterval = setInterval;
}

if (!globalThis.clearInterval) {
  globalThis.clearInterval = clearInterval;
}

if (!globalThis.URL) {
  globalThis.URL = URL as typeof globalThis.URL;
}

if (!globalThis.URLSearchParams) {
  globalThis.URLSearchParams =
    URLSearchParams as typeof globalThis.URLSearchParams;
}

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

const envFile = join(__dirname, '.test-db-env.json');

if (existsSync(envFile)) {
  const testEnv = JSON.parse(readFileSync(envFile, 'utf8')) as Record<
    string,
    string
  >;

  for (const [key, value] of Object.entries(testEnv)) {
    process.env[key] = value;
  }
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ?? 'test-access-token-secret';
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-token-secret';
