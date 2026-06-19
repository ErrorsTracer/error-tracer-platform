import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { getContainerRuntimeClient } from 'testcontainers';
import { migrateTestDatabase } from './support/db-migrate';
import { seedTestDatabase } from './support/db-seed';

const envFile = join(__dirname, '.test-db-env.json');
const containerLabel = 'com.errortracer.e2e';
const containerLabelValue = 'postgres';
const containerName = `errortracer-e2e-postgres-${process.pid}`;

async function removeStaleContainer() {
  const client = await getContainerRuntimeClient();
  const staleContainers = await client.container.dockerode.listContainers({
    all: true,
    filters: { label: [`${containerLabel}=${containerLabelValue}`] },
  });

  for (const staleContainerInfo of staleContainers) {
    const staleContainer = client.container.getById(staleContainerInfo.Id);

    try {
      await client.container.stop(staleContainer, { timeout: 0 });
    } catch {
      // The container may already be stopped; removal below is still the goal.
    }

    await client.container.remove(staleContainer, { removeVolumes: true });
  }
}

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
  process.env.ACCESS_TOKEN_SECRET =
    process.env.ACCESS_TOKEN_SECRET ?? 'test-access-token-secret';
  process.env.REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-token-secret';
  process.env.APP_KEY_GENERATOR =
    process.env.APP_KEY_GENERATOR ??
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  await removeStaleContainer();

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withName(containerName)
    .withLabels({ [containerLabel]: containerLabelValue })
    .withDatabase('errortracer_test')
    .withUsername('errortracer_test')
    .withPassword('errortracer_test')
    .start();

  const env = {
    NODE_ENV: 'test',
    TESTCONTAINERS_RYUK_DISABLED: process.env.TESTCONTAINERS_RYUK_DISABLED,
    DB_HOST: container.getHost(),
    DB_PORT: container.getPort().toString(),
    DB_USER: container.getUsername(),
    DB_PASSWORD: container.getPassword(),
    DB_NAME: container.getDatabase(),
    DATABASE_URL: container.getConnectionUri(),
    JWT_SECRET: process.env.JWT_SECRET,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    APP_KEY_GENERATOR: process.env.APP_KEY_GENERATOR,
    TEST_POSTGRES_CONTAINER_ID: container.getId(),
    TEST_POSTGRES_CONTAINER_NAME: container.getName(),
    TEST_POSTGRES_CONTAINER_LABEL: containerLabelValue,
  };

  Object.assign(process.env, env);
  writeFileSync(envFile, JSON.stringify(env, null, 2));

  try {
    await migrateTestDatabase();
    await seedTestDatabase();
  } catch (error) {
    await container.stop({ remove: true, removeVolumes: true });
    if (existsSync(envFile)) {
      unlinkSync(envFile);
    }
    throw error;
  }

  (
    globalThis as typeof globalThis & {
      __ERRORTRACER_POSTGRES__?: typeof container;
    }
  ).__ERRORTRACER_POSTGRES__ = container;
}
