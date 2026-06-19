import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getContainerRuntimeClient } from 'testcontainers';

const envFile = join(__dirname, '.test-db-env.json');
const containerLabel = 'com.errortracer.e2e';

type TestDbEnv = {
  TEST_POSTGRES_CONTAINER_ID?: string;
  TEST_POSTGRES_CONTAINER_LABEL?: string;
};

async function removeContainerById(containerId: string) {
  const client = await getContainerRuntimeClient();
  const container = client.container.getById(containerId);

  try {
    const inspectResult = await client.container.inspect(container);
    if (inspectResult.State.Running) {
      await client.container.stop(container, { timeout: 0 });
    }
  } catch {
    // If the container is already gone, teardown has done its job.
    return;
  }

  await client.container.remove(container, { removeVolumes: true });
}

async function removeContainerByLabel(labelValue: string) {
  const client = await getContainerRuntimeClient();
  const containers = await client.container.dockerode.listContainers({
    all: true,
    filters: { label: [`${containerLabel}=${labelValue}`] },
  });

  for (const containerInfo of containers) {
    const container = client.container.getById(containerInfo.Id);

    try {
      await client.container.stop(container, { timeout: 0 });
    } catch {
      // The container may already be stopped; removal below is still useful.
    }

    await client.container.remove(container, { removeVolumes: true });
  }
}

function readTestDbEnv(): TestDbEnv {
  if (!existsSync(envFile)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(envFile, 'utf8')) as TestDbEnv;
  } catch {
    return {};
  }
}

export default async function globalTeardown() {
  const globalWithContainer = globalThis as typeof globalThis & {
    __ERRORTRACER_POSTGRES__?: { stop: () => Promise<void> };
  };
  const testDbEnv = readTestDbEnv();
  const cleanupErrors: unknown[] = [];

  try {
    try {
      await globalWithContainer.__ERRORTRACER_POSTGRES__?.stop();
    } catch (error) {
      cleanupErrors.push(error);
    }

    if (testDbEnv.TEST_POSTGRES_CONTAINER_ID) {
      try {
        await removeContainerById(testDbEnv.TEST_POSTGRES_CONTAINER_ID);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (testDbEnv.TEST_POSTGRES_CONTAINER_LABEL) {
      try {
        await removeContainerByLabel(testDbEnv.TEST_POSTGRES_CONTAINER_LABEL);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
  } finally {
    if (existsSync(envFile)) {
      unlinkSync(envFile);
    }
  }

  if (cleanupErrors.length > 0) {
    throw cleanupErrors[cleanupErrors.length - 1];
  }
}
