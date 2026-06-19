import { randomBytes } from 'crypto';

export function generateCred(length = 26): string {
  // const buffer = randomBytes(Math.ceil(length / 2));

  // return buffer.toString('hex').slice(0, length);

  const keygen = process.env.APP_KEY_GENERATOR as string;
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => keygen[byte % keygen.length]).join('');
}
