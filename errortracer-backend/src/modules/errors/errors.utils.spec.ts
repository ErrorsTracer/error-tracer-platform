import { generateErrorFingerprint, sanitizeValue } from './errors.utils';

describe('registry utils', () => {
  it('redacts sensitive fields recursively', () => {
    expect(
      sanitizeValue({
        authorization: 'Bearer secret',
        headers: {
          cookie: 'session=secret',
          'x-api-key': 'key',
        },
        body: {
          password: 'secret',
          nested: [{ accessToken: 'token', safe: 'value' }],
        },
      }),
    ).toEqual({
      authorization: '[Redacted]',
      headers: {
        cookie: '[Redacted]',
        'x-api-key': '[Redacted]',
      },
      body: {
        password: '[Redacted]',
        nested: [{ accessToken: '[Redacted]', safe: 'value' }],
      },
    });
  });

  it('generates stable fingerprints from normalized error identity', () => {
    const first = generateErrorFingerprint(
      {
        message: 'Cannot read properties of undefined',
        name: 'TypeError',
        stack:
          'TypeError\n    at BillingPage (https://example.com/app.js:10:20)',
        framework: 'React',
        runtime: 'browser',
      },
      'project-1',
      'production',
    );
    const second = generateErrorFingerprint(
      {
        message: '  Cannot   read properties of undefined ',
        name: 'typeerror',
        stack:
          'TypeError\n    at BillingPage (https://example.com/app.js:99:40)',
        framework: 'react',
        runtime: 'browser',
      },
      'project-1',
      'production',
    );

    expect(second).toBe(first);
  });
});
