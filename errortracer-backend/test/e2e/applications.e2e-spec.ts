import request from 'supertest';
import { registerAndLogin } from '../support/auth';
import { resetTestData } from '../support/db-reset';
import { createE2eApp, E2eAppContext } from '../support/e2e-app';
import {
  createApplicationFixture,
  enableProductionEnvironment,
  getReactFrameworkId,
  inviteUserToApplication,
} from '../support/fixtures';
import { authHeader } from '../support/http';

describe('Applications API (e2e)', () => {
  let context: E2eAppContext;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('covers application endpoint contracts and authorization', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');
    const member = await registerAndLogin(context.httpServer, 'member');

    await request(context.httpServer).get('/v0.1/applications').expect(401);

    const frameworksResponse = await request(context.httpServer)
      .get('/v0.1/applications/frameworks')
      .expect(200);
    expect(frameworksResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: 'React.js',
        }),
      ]),
    );

    await request(context.httpServer)
      .post('/v0.1/applications')
      .set(authHeader(owner.accessToken))
      .send({ name: '', envName: '', framework: 'not-a-uuid' })
      .expect(400);

    const frameworkId = await getReactFrameworkId(context);
    const application = await createApplicationFixture(context, owner);
    let appKey = application.appKey;

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({ projectId: application.id, message: 'ProductionDisabledSmoke' })
      .expect(400);

    await request(context.httpServer)
      .post('/v0.1/applications')
      .set(authHeader(owner.accessToken))
      .send({
        name: application.name,
        envName: 'production',
        about: 'Duplicate',
        framework: frameworkId,
      })
      .expect(400);

    const listResponse = await request(context.httpServer)
      .get('/v0.1/applications')
      .set(authHeader(owner.accessToken))
      .expect(200);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: application.id,
          totalErrors: 0,
          criticalErrors: 0,
        }),
      ]),
    );

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            errorsCount: 0,
            criticalCount: 0,
          }),
        );
        expect(typeof body.errorsCount).toBe('number');
        expect(typeof body.criticalCount).toBe('number');
      });

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/credentials`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          appKey,
          isEnabled: false,
        });
      });

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/memberships`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'owner',
              status: 'active',
            }),
          ]),
        );
      });

    await inviteUserToApplication(context, owner, application.id, member.email);

    await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/credentials/rotate`)
      .set(authHeader(member.accessToken))
      .expect(404);

    const rotateResponse = await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/credentials/rotate`)
      .set(authHeader(owner.accessToken))
      .expect(200);
    expect(rotateResponse.body).toEqual({
      appKey: expect.any(String),
      isEnabled: false,
      applicationId: application.id,
    });
    expect(rotateResponse.body.appKey).not.toBe(appKey);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({ projectId: application.id, message: 'OldRotatedKeySmoke' })
      .expect(401);

    appKey = rotateResponse.body.appKey;

    await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/suspend`)
      .set(authHeader(member.accessToken))
      .expect(404);

    await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/suspend`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Application suspended successfully',
        });
      });

    await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/activate`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Application activated successfully',
        });
      });

    await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/credentials/production`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Production mode updated successfully',
        });
      });

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({
        projectId: application.id,
        message: 'NormalErrorSmoke',
        transaction: 'GET /dashboard',
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({
        projectId: application.id,
        message: 'CriticalErrorSmoke',
        level: 'fatal',
        transaction: 'GET /dashboard',
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({
        projectId: application.id,
        message: 'WarningErrorSmoke',
        level: 'warning',
        url: 'https://example.com/settings',
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({
        projectId: application.id,
        message: 'NamedErrorSmoke',
        name: 'RepeatedTypeErrorSmoke',
        level: 'error',
        request: { url: '/api/profile' },
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', appKey)
      .send({
        projectId: application.id,
        message: 'NamedErrorSmokeAgain',
        name: 'RepeatedTypeErrorSmoke',
        level: 'error',
        request: { url: '/api/profile' },
      })
      .expect(201);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors?limit=101`)
      .set(authHeader(owner.accessToken))
      .expect(400);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors?limit=1`)
      .set(authHeader(member.accessToken))
      .expect(404);

    const firstErrorsPage = await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors?limit=2`)
      .set(authHeader(owner.accessToken))
      .expect(200);
    expect(firstErrorsPage.body).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          error: expect.any(String),
          level: expect.any(String),
        }),
      ]),
      pageInfo: {
        limit: 2,
        hasMore: true,
        nextCursor: expect.any(String),
      },
    });
    expect(firstErrorsPage.body.data).toHaveLength(2);

    const secondErrorsPage = await request(context.httpServer)
      .get(
        `/v0.1/applications/${application.id}/errors?limit=2&cursor=${firstErrorsPage.body.pageInfo.nextCursor}`,
      )
      .set(authHeader(owner.accessToken))
      .expect(200);
    expect(secondErrorsPage.body.pageInfo).toEqual({
      limit: 2,
      hasMore: true,
      nextCursor: expect.any(String),
    });
    expect(secondErrorsPage.body.data).toHaveLength(2);

    const thirdErrorsPage = await request(context.httpServer)
      .get(
        `/v0.1/applications/${application.id}/errors?limit=2&cursor=${secondErrorsPage.body.pageInfo.nextCursor}`,
      )
      .set(authHeader(owner.accessToken))
      .expect(200);
    expect(thirdErrorsPage.body.pageInfo).toEqual({
      limit: 2,
      hasMore: false,
      nextCursor: null,
    });
    expect(thirdErrorsPage.body.data).toHaveLength(1);

    const firstPageIds = firstErrorsPage.body.data.map(
      (item: { id: string }) => item.id,
    );
    const secondPageIds = secondErrorsPage.body.data.map(
      (item: { id: string }) => item.id,
    );
    const thirdPageIds = thirdErrorsPage.body.data.map(
      (item: { id: string }) => item.id,
    );
    expect(
      new Set([...firstPageIds, ...secondPageIds, ...thirdPageIds]).size,
    ).toBe(5);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors/recent?limit=10`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.pageInfo).toEqual({
          limit: 10,
          hasMore: false,
        });
        expect(body.data).toHaveLength(5);
        expect(body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'RepeatedTypeErrorSmoke',
              error: 'NamedErrorSmokeAgain',
              errorName: 'NamedErrorSmokeAgain',
              repeated: 1,
            }),
            expect.objectContaining({
              name: 'RepeatedTypeErrorSmoke',
              error: 'NamedErrorSmoke',
              errorName: 'NamedErrorSmoke',
              repeated: 1,
            }),
            expect.objectContaining({
              error: 'NormalErrorSmoke',
              errorName: 'NormalErrorSmoke',
              repeated: 1,
            }),
          ]),
        );
        expect(
          body.data.filter(
            (item: { name: string | null }) =>
              item.name === 'RepeatedTypeErrorSmoke',
          ),
        ).toHaveLength(2);
        expect(typeof body.data[0].repeated).toBe('number');
      });

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors/top-affected-routes`)
      .set(authHeader(member.accessToken))
      .expect(404);

    await request(context.httpServer)
      .get(
        `/v0.1/applications/${application.id}/errors/top-affected-routes?limit=2`,
      )
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          data: [
            {
              route: '/api/profile',
              errors: 2,
              lastSeenAt: expect.any(String),
            },
            {
              route: 'GET /dashboard',
              errors: 2,
              lastSeenAt: expect.any(String),
            },
          ],
          pageInfo: {
            limit: 2,
          },
        });
      });

    const repeatedError = firstErrorsPage.body.data.find(
      (item: { name: string | null }) => item.name === 'RepeatedTypeErrorSmoke',
    );
    expect(repeatedError).toEqual(
      expect.objectContaining({
        id: expect.any(String),
      }),
    );

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors/${repeatedError.id}`)
      .set(authHeader(member.accessToken))
      .expect(404);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors/${repeatedError.id}`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            id: repeatedError.id,
            name: 'RepeatedTypeErrorSmoke',
            errorName: 'RepeatedTypeErrorSmoke',
            repeated: 0,
          }),
        );
        expect(typeof body.repeated).toBe('number');
      });

    await request(context.httpServer)
      .get(
        `/v0.1/applications/${application.id}/errors/00000000-0000-0000-0000-000000000000`,
      )
      .set(authHeader(owner.accessToken))
      .expect(404);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            errorsCount: 5,
            criticalCount: 1,
          }),
        );
        expect(typeof body.errorsCount).toBe('number');
        expect(typeof body.criticalCount).toBe('number');
      });

    await request(context.httpServer)
      .get('/v0.1/applications')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: application.id,
              totalErrors: 5,
              criticalErrors: 1,
            }),
          ]),
        );
        const listedApplication = body.find(
          (item: { id: string }) => item.id === application.id,
        );
        expect(typeof listedApplication.totalErrors).toBe('number');
        expect(typeof listedApplication.criticalErrors).toBe('number');
      });

    const secondApplication = await createApplicationFixture(context, owner);
    await enableProductionEnvironment(context, owner, secondApplication.id);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', secondApplication.appKey)
      .send({
        projectId: secondApplication.id,
        message: 'SecondAppCriticalErrorSmoke',
        level: 'critical',
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', secondApplication.appKey)
      .send({
        projectId: secondApplication.id,
        message: 'SecondAppNormalErrorSmoke',
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', secondApplication.appKey)
      .send({
        projectId: secondApplication.id,
        message: 'NamedErrorSmokeFromSecondApp',
        name: 'RepeatedTypeErrorSmoke',
        level: 'error',
        framework: 'node',
        runtime: 'server',
      })
      .expect(201);

    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', secondApplication.appKey)
      .send({
        projectId: secondApplication.id,
        message: 'NamedWarningSmokeFromSecondApp',
        name: 'RepeatedTypeErrorSmoke',
        level: 'warning',
        framework: 'react',
        runtime: 'browser',
      })
      .expect(201);

    await request(context.httpServer)
      .get('/v0.1/applications/errors/recent')
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/applications/errors/recent')
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          data: [],
          pageInfo: {
            limit: 25,
            hasMore: false,
          },
        });
      });

    await request(context.httpServer)
      .get('/v0.1/applications/errors/recent?limit=10')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.pageInfo).toEqual({
          limit: 10,
          hasMore: false,
        });
        expect(body.data).toEqual(
          expect.arrayContaining([
            {
              errorName: 'NamedErrorSmokeFromSecondApp',
              level: 'error',
              client: 'node',
              runtime: 'server',
              repeated: 1,
              lastSeenAt: expect.any(String),
            },
            {
              errorName: 'NamedWarningSmokeFromSecondApp',
              level: 'warning',
              client: 'react',
              runtime: 'browser',
              repeated: 1,
              lastSeenAt: expect.any(String),
            },
          ]),
        );
        expect(
          body.data.filter(
            (item: { errorName: string }) =>
              item.errorName.startsWith('NamedErrorSmoke'),
          ),
        ).toHaveLength(3);
        expect(typeof body.data[0].repeated).toBe('number');
      });

    await request(context.httpServer).get('/v0.1/applications/errors').expect(401);

    await request(context.httpServer)
      .get('/v0.1/applications/errors')
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          data: [],
          pageInfo: {
            limit: 25,
            hasMore: false,
            nextCursor: null,
          },
        });
      });

    await request(context.httpServer)
      .get('/v0.1/applications/errors?limit=101')
      .set(authHeader(owner.accessToken))
      .expect(400);

    await request(context.httpServer)
      .get(
        `/v0.1/applications/errors?applicationId=${secondApplication.id}&level=error&sort=topRepeated&limit=10`,
      )
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.pageInfo).toEqual({
          limit: 10,
          hasMore: false,
          nextCursor: null,
        });
        expect(body.data).toEqual(
          expect.arrayContaining([
            {
              id: expect.any(String),
              errorName: 'NamedErrorSmokeFromSecondApp',
              level: 'error',
              client: 'node',
              runtime: 'server',
              applicationId: secondApplication.id,
              applicationName: secondApplication.name,
              repeated: 1,
              lastOccurredAt: expect.any(String),
            },
            expect.objectContaining({
              errorName: 'SecondAppNormalErrorSmoke',
              level: 'error',
              applicationId: secondApplication.id,
              repeated: 1,
            }),
          ]),
        );
        expect(
          body.data.every(
            (item: { applicationId: string; level: string }) =>
              item.applicationId === secondApplication.id &&
              item.level === 'error',
          ),
        ).toBe(true);
      });

    const firstGroupedErrorsPage = await request(context.httpServer)
      .get('/v0.1/applications/errors?level=error&sort=topRepeated&limit=2')
      .set(authHeader(owner.accessToken))
      .expect(200);
    expect(firstGroupedErrorsPage.body.pageInfo).toEqual({
      limit: 2,
      hasMore: true,
      nextCursor: expect.any(String),
    });
    expect(firstGroupedErrorsPage.body.data).toHaveLength(2);
    expect(firstGroupedErrorsPage.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          repeated: 1,
        }),
      ]),
    );

    await request(context.httpServer)
      .get(
        `/v0.1/applications/errors?level=error&sort=topRepeated&limit=2&cursor=${firstGroupedErrorsPage.body.pageInfo.nextCursor}`,
      )
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.pageInfo).toEqual({
          limit: 2,
          hasMore: true,
          nextCursor: expect.any(String),
        });
        expect(body.data).toHaveLength(2);
        expect(body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              errorName: 'NamedErrorSmokeAgain',
              level: 'error',
              applicationId: application.id,
              repeated: 1,
            }),
            expect.objectContaining({
              errorName: 'NamedErrorSmoke',
              level: 'error',
              applicationId: application.id,
              repeated: 1,
            }),
          ]),
        );
      });

    await request(context.httpServer)
      .get('/v0.1/applications/errors?sort=lastOccurred&limit=10')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              errorName: 'SecondAppCriticalErrorSmoke',
              applicationId: secondApplication.id,
              level: 'critical',
              repeated: 1,
            }),
          ]),
        );
        expect(
          body.data.every(
            (item: { level: string }) => item.level === 'critical',
          ),
        ).toBe(true);
        expect(body.pageInfo).toEqual(
          expect.objectContaining({
            limit: 10,
            hasMore: false,
            nextCursor: null,
          }),
        );
      });

    await request(context.httpServer)
      .get(
        '/v0.1/applications/errors?applicationId=00000000-0000-0000-0000-000000000000',
      )
      .set(authHeader(owner.accessToken))
      .expect(404);

    await request(context.httpServer)
      .get('/v0.1/applications/errors/severity-distribution')
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/applications/errors/severity-distribution')
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          criticalErrorsCount: 0,
          totalErrorsCount: 0,
        });
      });

    await request(context.httpServer)
      .get('/v0.1/applications/errors/severity-distribution')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          criticalErrorsCount: 2,
          totalErrorsCount: 9,
        });
      });

    await request(context.httpServer)
      .delete(`/v0.1/applications/${application.id}`)
      .set(authHeader(member.accessToken))
      .expect(404);

    await request(context.httpServer)
      .delete(`/v0.1/applications/${application.id}`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Application deleted successfully',
        });
      });

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}`)
      .set(authHeader(owner.accessToken))
      .expect(404);
  });

  it('reports application errors by the day they were received', async () => {
    const owner = await registerAndLogin(context.httpServer, 'report-owner');
    const application = await createApplicationFixture(context, owner);
    await enableProductionEnvironment(context, owner, application.id);

    const backdatedWednesday = new Date();
    backdatedWednesday.setUTCHours(12, 0, 0, 0);
    backdatedWednesday.setUTCDate(
      backdatedWednesday.getUTCDate() -
        ((backdatedWednesday.getUTCDay() + 4) % 7 || 7),
    );

    for (const index of [1, 2, 3]) {
      await request(context.httpServer)
        .post('/v0.1/errors/ingest')
        .set('X-ErrorTracer-Key', application.appKey)
        .send({
          projectId: application.id,
          message: `Received today report smoke ${index}`,
          timestamp: backdatedWednesday.toISOString(),
        })
        .expect(201);
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = (new Date().getUTCDay() + 6) % 7;
    const thisWeek = days.map((day, index) => ({
      day,
      errors: index === todayIndex ? 3 : 0,
    }));
    const lastWeek = days.map((day) => ({ day, errors: 0 }));

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/errors/report`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          thisWeek,
          lastWeek,
        });
      });
  });

  it('reports errors across applications owned by the user only', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owned-report');
    const otherOwner = await registerAndLogin(
      context.httpServer,
      'owned-report-other',
    );
    const firstApplication = await createApplicationFixture(context, owner);
    const secondApplication = await createApplicationFixture(context, owner);
    const memberOnlyApplication = await createApplicationFixture(
      context,
      otherOwner,
    );

    await enableProductionEnvironment(context, owner, firstApplication.id);
    await enableProductionEnvironment(context, owner, secondApplication.id);
    await enableProductionEnvironment(
      context,
      otherOwner,
      memberOnlyApplication.id,
    );
    await inviteUserToApplication(
      context,
      otherOwner,
      memberOnlyApplication.id,
      owner.email,
    );
    const invitationsResponse = await request(context.httpServer)
      .get('/v0.1/users/membership-invitations')
      .set(authHeader(owner.accessToken))
      .expect(200);
    await request(context.httpServer)
      .patch(
        `/v0.1/users/membership-invitations/${invitationsResponse.body[0].id}/accept`,
      )
      .set(authHeader(owner.accessToken))
      .expect(200);

    for (const application of [
      firstApplication,
      firstApplication,
      secondApplication,
      secondApplication,
      secondApplication,
      memberOnlyApplication,
      memberOnlyApplication,
      memberOnlyApplication,
      memberOnlyApplication,
      memberOnlyApplication,
    ]) {
      await request(context.httpServer)
        .post('/v0.1/errors/ingest')
        .set('X-ErrorTracer-Key', application.appKey)
        .send({
          projectId: application.id,
          message: `Combined report smoke ${application.id}`,
        })
        .expect(201);
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = (new Date().getUTCDay() + 6) % 7;
    const thisWeek = days.map((day, index) => ({
      day,
      errors: index === todayIndex ? 5 : 0,
    }));
    const lastWeek = days.map((day) => ({ day, errors: 0 }));

    await request(context.httpServer)
      .get('/v0.1/applications/errors/report')
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/applications/errors/report')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          thisWeek,
          lastWeek,
        });
      });
  });

  it('reports usage for an application across credential rotations', async () => {
    const owner = await registerAndLogin(context.httpServer, 'usage-owner');
    const stranger = await registerAndLogin(
      context.httpServer,
      'usage-stranger',
    );
    const application = await createApplicationFixture(context, owner);
    await enableProductionEnvironment(context, owner, application.id);

    const firstPayload = {
      projectId: application.id,
      message: 'Usage before rotation',
    };
    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', application.appKey)
      .send(firstPayload)
      .expect(201);

    const rotated = await request(context.httpServer)
      .put(`/v0.1/applications/${application.id}/credentials/rotate`)
      .set(authHeader(owner.accessToken))
      .expect(200);
    const secondPayload = {
      projectId: application.id,
      message: 'Usage after rotation',
    };
    await request(context.httpServer)
      .post('/v0.1/errors/ingest')
      .set('X-ErrorTracer-Key', rotated.body.appKey)
      .send(secondPayload)
      .expect(201);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/usage`)
      .set(authHeader(stranger.accessToken))
      .expect(404);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}/usage`)
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          totalErrorBytes: String(
            Buffer.byteLength(JSON.stringify(firstPayload), 'utf8') +
              Buffer.byteLength(JSON.stringify(secondPayload), 'utf8'),
          ),
          totalErrorCount: '2',
        });
      });

    const expectedUsage = {
      totalErrorBytes: String(
        Buffer.byteLength(JSON.stringify(firstPayload), 'utf8') +
          Buffer.byteLength(JSON.stringify(secondPayload), 'utf8'),
      ),
      totalErrorCount: '2',
    };

    await request(context.httpServer)
      .get('/v0.1/users/usage')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expectedUsage);
      });

    await request(context.httpServer)
      .delete(`/v0.1/applications/${application.id}`)
      .set(authHeader(owner.accessToken))
      .expect(200);

    await request(context.httpServer)
      .get('/v0.1/users/usage')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expectedUsage);
      });
  });
});
