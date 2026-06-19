import { getModelToken } from '@nestjs/sequelize';
import request from 'supertest';
import { Errors } from '../../src/database/models/errors.model';
import { Usage } from '../../src/database/models/usage.model';
import { registerAndLogin } from '../support/auth';
import { resetTestData } from '../support/db-reset';
import { createE2eApp, E2eAppContext } from '../support/e2e-app';
import {
  createApplicationFixture,
  enableProductionEnvironment,
} from '../support/fixtures';

describe('Generic error ingestion API (e2e)', () => {
  let context: E2eAppContext;
  let errorsModel: typeof Errors;
  let usageModel: typeof Usage;

  beforeAll(async () => {
    context = await createE2eApp();
    errorsModel = context.app.get<typeof Errors>(getModelToken(Errors));
    usageModel = context.app.get<typeof Usage>(getModelToken(Usage));
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function createIngestionTarget(prefix = 'owner') {
    const owner = await registerAndLogin(context.httpServer, prefix);
    const application = await createApplicationFixture(context, owner);
    await enableProductionEnvironment(context, owner, application.id);

    return application;
  }

  function postIngest(appKey: string, payload: Record<string, unknown>) {
    return request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send(payload);
  }

  it('successfully ingests a minimal valid error payload', async () => {
    const application = await createIngestionTarget();
    const payload = {
      projectId: application.id,
      message: 'Unhandled TypeError',
    };

    const response = await postIngest(application.appKey, payload).expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      status: 'accepted',
    });

    const usage = await usageModel.findOne({
      where: { applicationId: application.id },
    });

    expect(usage).toEqual(
      expect.objectContaining({
        applicationId: application.id,
        userId: expect.any(String),
        totalErrorBytes: String(
          Buffer.byteLength(JSON.stringify(payload), 'utf8'),
        ),
        totalErrorCount: '1',
      }),
    );
  });

  it('successfully ingests a rich React/browser payload', async () => {
    const application = await createIngestionTarget();

    await postIngest(application.appKey, {
      projectId: application.id,
      environment: 'production',
      framework: 'react',
      language: 'typescript',
      runtime: 'browser',
      level: 'error',
      message: 'Unhandled TypeError: Cannot read properties of undefined',
      name: 'TypeError',
      stack: 'TypeError\n    at BillingPage (https://example.com/app.js:10:20)',
      handled: false,
      release: '1.2.3',
      url: 'https://example.com/dashboard',
      transaction: 'GET /dashboard',
      user: { id: 'user-123', email: 'user@example.com' },
      request: { method: 'GET', url: '/dashboard', headers: {} },
      tags: { region: 'us-east-1', feature: 'billing' },
      extra: { component: 'BillingPage' },
      breadcrumbs: [
        {
          timestamp: '2026-05-14T10:29:59.000Z',
          category: 'ui.click',
          message: 'Clicked checkout button',
          level: 'info',
          data: {},
        },
      ],
      contexts: {
        browser: { name: 'Chrome', version: '124' },
        os: { name: 'macOS', version: '14' },
      },
    }).expect(201);

    const persisted = await errorsModel.findOne({
      where: { applicationId: application.id },
    });

    expect(persisted?.framework).toBe('react');
    expect(persisted?.runtime).toBe('browser');
    expect(persisted?.tags).toEqual({
      region: 'us-east-1',
      feature: 'billing',
    });
  });

  it('increments one aggregate row safely for concurrent ingestion', async () => {
    const application = await createIngestionTarget('concurrent-owner');
    const payloads = Array.from({ length: 20 }, (_, index) => ({
      projectId: application.id,
      message: `Concurrent ingestion ${index}`,
    }));

    await Promise.all(
      payloads.map((payload) =>
        postIngest(application.appKey, payload).expect(201),
      ),
    );

    const usages = await usageModel.findAll({
      where: { applicationId: application.id },
    });
    const expectedBytes = payloads.reduce(
      (total, payload) =>
        total + Buffer.byteLength(JSON.stringify(payload), 'utf8'),
      0,
    );

    expect(usages).toHaveLength(1);
    expect(usages[0].totalErrorCount).toBe('20');
    expect(usages[0].totalErrorBytes).toBe(String(expectedBytes));
  });

  it('accepts database-shaped payloads that use error as the message field', async () => {
    const application = await createIngestionTarget();

    await postIngest(application.appKey, {
      error: 'Submitted profile payload failed server-side validation',
      environment: 'production',
      framework: 'NestJS',
      language: 'TypeScript',
      runtime: 'server',
      level: 'error',
      name: 'ValidationError',
      fingerprint: 'dummy:users:validationerror',
      handled: true,
      timestamp: '2026-05-20T23:39:27.000Z',
      transaction: 'PATCH /api/profile',
      extra: { serverName: 'api-4', durationMs: 4095 },
    }).expect(201);

    const persisted = await errorsModel.findOne({
      where: { applicationId: application.id },
    });

    expect(persisted?.error).toBe(
      'Submitted profile payload failed server-side validation',
    );
    expect(persisted?.fingerprint).toBe('dummy:users:validationerror');
  });

  it('rejects payload missing message', async () => {
    const application = await createIngestionTarget();

    await postIngest(application.appKey, {
      projectId: application.id,
    }).expect(400);
  });

  it('rejects invalid level', async () => {
    const application = await createIngestionTarget();

    await postIngest(application.appKey, {
      projectId: application.id,
      message: 'Invalid level smoke',
      level: 'panic',
    }).expect(400);
  });

  it('rejects missing API key', async () => {
    const application = await createIngestionTarget();

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .send({
        projectId: application.id,
        message: 'Missing key smoke',
      })
      .expect(401);
  });

  it('rejects invalid API key', async () => {
    const application = await createIngestionTarget();

    await postIngest('invalid-key', {
      projectId: application.id,
      message: 'Invalid key smoke',
    }).expect(401);

    expect(await usageModel.count()).toBe(0);
  });

  it('ensures response does not leak sensitive data', async () => {
    const application = await createIngestionTarget();

    const response = await postIngest(application.appKey, {
      projectId: application.id,
      message: 'Response leak smoke',
      request: {
        headers: { authorization: 'Bearer secret' },
        body: { password: 'secret' },
      },
    }).expect(201);

    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(response.body).toEqual({
      id: expect.any(String),
      status: 'accepted',
    });
  });
});
