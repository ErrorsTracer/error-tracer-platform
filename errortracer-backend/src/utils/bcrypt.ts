import * as bcrypt from 'bcrypt';

import { randomBytes, randomUUID } from 'crypto';

// Generate a salt (a random value) to use in the hashing process
const saltRounds = 10;

// Hash the password using bcrypt
export const hashPassword = (password: string) =>
  new Promise<string>((resolve, reject) => {
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } else {
        resolve(hash);
      }
    });
  });

export const comparePassword = (password: string, hashFromDatabase: string) => {
  return new Promise<boolean>((resolve, reject) => {
    bcrypt.compare(password, hashFromDatabase, (err, result) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } else {
        if (result) {
          resolve(result);
        } else {
          resolve(false);
        }
      }
    });
  });
};

export function generateRefreshToken() {
  const tokenId = randomUUID();
  const secret = randomBytes(32).toString('hex');

  const refreshToken = `${tokenId}.${secret}`;

  return {
    tokenId,
    refreshToken,
  };
}

export function hashRefreshToken(token: string) {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
}
