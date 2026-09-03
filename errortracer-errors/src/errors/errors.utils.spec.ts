import { generateErrorFingerprint, sanitizeValue } from './errors.utils';

describe('errors utilities', () => {
  it('generates stable fingerprints while ignoring stack line numbers', () => {
    const base = { message: 'Boom', stack: 'at run (/app/index.ts:10:2)', runtime: 'server' };
    expect(generateErrorFingerprint(base, 'app', 'production')).toBe(
      generateErrorFingerprint({ ...base, stack: 'at run (/app/index.ts:99:8)' }, 'app', 'production'),
    );
  });

  it('recursively redacts sensitive values', () => {
    expect(sanitizeValue({ headers: { authorization: 'secret' }, password: 'secret' })).toEqual({
      headers: { authorization: '[Redacted]' },
      password: '[Redacted]',
    });
  });
});
