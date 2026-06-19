import { Client } from 'pg';

const mutableTables = [
  'usage',
  'notifications',
  'errors-logs',
  'auth_sessions',
  'environments',
  'application_memberships',
  'applications',
  'users',
];

export async function resetTestData() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const quotedTables = mutableTables
    .map((tableName) => `"${tableName}"`)
    .join(', ');

  try {
    await client.connect();
    await client.query(`TRUNCATE ${quotedTables} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}
