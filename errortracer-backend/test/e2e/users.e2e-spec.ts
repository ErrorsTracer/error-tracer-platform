import { getModelToken } from '@nestjs/sequelize';
import request from 'supertest';
import { ApplicationMembershipStatus } from '../../src/common/constants/app.constants';
import { ApplicationMembership } from '../../src/database/models/application-membership.model';
import { Errors } from '../../src/database/models/errors.model';
import { loginUser, registerAndLogin } from '../support/auth';
import { resetTestData } from '../support/db-reset';
import { createE2eApp, E2eAppContext } from '../support/e2e-app';
import {
  createApplicationFixture,
  inviteUserToApplication,
} from '../support/fixtures';
import { authHeader } from '../support/http';

describe('Users API (e2e)', () => {
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

  it('covers profile and notification endpoints', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');
    const member = await registerAndLogin(context.httpServer, 'member');
    const application = await createApplicationFixture(context, owner);
    await inviteUserToApplication(context, owner, application.id, member.email);

    await request(context.httpServer).get('/v0.1/users/profile').expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            email: owner.email,
            firstName: 'owner',
            lastName: 'User',
          }),
        );
        expect(body.password).toBeUndefined();
      });

    const notificationsResponse = await request(context.httpServer)
      .get('/v0.1/users/notifications')
      .set(authHeader(member.accessToken))
      .expect(200);

    expect(notificationsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          isRead: false,
          message: expect.stringContaining('invited'),
        }),
      ]),
    );

    const notificationId = notificationsResponse.body[0].id;

    await request(context.httpServer)
      .patch(`/v0.1/users/notifications/${notificationId}/read`)
      .expect(401);

    await request(context.httpServer)
      .patch(`/v0.1/users/notifications/${notificationId}/read`)
      .set(authHeader(owner.accessToken))
      .expect(404);

    await request(context.httpServer)
      .patch(`/v0.1/users/notifications/${notificationId}/read`)
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Notification marked as read successfully',
        });
      });

    await request(context.httpServer)
      .get('/v0.1/users/notifications')
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body[0]).toEqual(
          expect.objectContaining({ id: notificationId, isRead: true }),
        );
      });
  });

  it('returns and accepts membership invitations for the authenticated user', async () => {
    const owner = await registerAndLogin(context.httpServer, 'invite-owner');
    const member = await registerAndLogin(context.httpServer, 'invite-member');
    const otherUser = await registerAndLogin(
      context.httpServer,
      'invite-other',
    );
    const application = await createApplicationFixture(context, owner);

    await inviteUserToApplication(context, owner, application.id, member.email);

    await request(context.httpServer)
      .get('/v0.1/users/membership-invitations')
      .expect(401);

    const invitationsResponse = await request(context.httpServer)
      .get('/v0.1/users/membership-invitations')
      .set(authHeader(member.accessToken))
      .expect(200);

    expect(invitationsResponse.body).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        role: 'member',
        status: ApplicationMembershipStatus.INVITED,
        joinedAt: null,
        application: expect.objectContaining({
          id: application.id,
          name: application.name,
          owner: expect.objectContaining({
            email: owner.email,
          }),
        }),
        invitedByUser: expect.objectContaining({
          email: owner.email,
        }),
      }),
    ]);

    const invitationId = invitationsResponse.body[0].id;

    await request(context.httpServer)
      .patch(`/v0.1/users/membership-invitations/${invitationId}/accept`)
      .set(authHeader(otherUser.accessToken))
      .expect(404);

    await request(context.httpServer)
      .patch(`/v0.1/users/membership-invitations/${invitationId}/accept`)
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          message: 'Membership invitation accepted successfully',
          membership: expect.objectContaining({
            id: invitationId,
            status: ApplicationMembershipStatus.ACTIVE,
            joinedAt: expect.any(String),
            application: expect.objectContaining({
              id: application.id,
              name: application.name,
            }),
          }),
        });
      });

    await request(context.httpServer)
      .get('/v0.1/users/membership-invitations')
      .set(authHeader(member.accessToken))
      .expect(200)
      .expect([]);

    await request(context.httpServer)
      .get(`/v0.1/applications/${application.id}`)
      .set(authHeader(member.accessToken))
      .expect(200);
  });

  it('updates profile information and password for the authenticated user', async () => {
    const owner = await registerAndLogin(context.httpServer, 'settings-owner');
    const otherUser = await registerAndLogin(
      context.httpServer,
      'settings-other',
    );
    const updatedEmail = 'Updated.Settings@example.com';

    await request(context.httpServer).patch('/v0.1/users/profile').expect(401);
    await request(context.httpServer).patch('/v0.1/users/password').expect(401);

    await request(context.httpServer)
      .patch('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .send({
        firstName: 'Updated',
        lastName: 'Owner',
        avatar: 'new-avatar.png',
        email: updatedEmail,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            email: updatedEmail.toLowerCase(),
            firstName: 'Updated',
            lastName: 'Owner',
            avatar: 'new-avatar.png',
          }),
        );
        expect(body.password).toBeUndefined();
      });

    await request(context.httpServer)
      .patch('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .send({ email: otherUser.email })
      .expect(422);

    await request(context.httpServer)
      .patch('/v0.1/users/password')
      .set(authHeader(owner.accessToken))
      .send({
        currentPassword: owner.password,
        newPassword: 'Password456!',
        confirmNewPassword: 'NotTheSame456!',
      })
      .expect(400);

    await request(context.httpServer)
      .patch('/v0.1/users/password')
      .set(authHeader(owner.accessToken))
      .send({
        currentPassword: 'wrong-password',
        newPassword: 'Password456!',
        confirmNewPassword: 'Password456!',
      })
      .expect(401);

    await request(context.httpServer)
      .patch('/v0.1/users/password')
      .set(authHeader(owner.accessToken))
      .send({
        currentPassword: owner.password,
        newPassword: 'Password456!',
        confirmNewPassword: 'Password456!',
      })
      .expect(200)
      .expect({ message: 'Password updated successfully' });

    await request(context.httpServer)
      .post('/v0.1/auth/login')
      .send({ email: updatedEmail.toLowerCase(), password: owner.password })
      .expect(401);

    await loginUser(
      context.httpServer,
      updatedEmail.toLowerCase(),
      'Password456!',
    );
  });

  it('returns dashboard stats across the user applications', async () => {
    const owner = await registerAndLogin(context.httpServer, 'stats-owner');
    const member = await registerAndLogin(context.httpServer, 'stats-member');
    const firstApplication = await createApplicationFixture(context, owner);
    const secondApplication = await createApplicationFixture(context, owner);
    await inviteUserToApplication(
      context,
      owner,
      firstApplication.id,
      member.email,
    );

    const membershipsModel = context.app.get<typeof ApplicationMembership>(
      getModelToken(ApplicationMembership),
    );
    await membershipsModel.update(
      {
        status: ApplicationMembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
      {
        where: {
          applicationId: firstApplication.id,
          status: ApplicationMembershipStatus.INVITED,
        },
      },
    );

    const thisWeekStart = new Date();
    thisWeekStart.setUTCHours(0, 0, 0, 0);
    thisWeekStart.setUTCDate(
      thisWeekStart.getUTCDate() - ((thisWeekStart.getUTCDay() + 6) % 7),
    );
    const lastWeekDate = new Date(thisWeekStart);
    lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 1);
    const thisWeekDate = new Date(thisWeekStart);
    thisWeekDate.setUTCHours(12, 0, 0, 0);

    const errorsModel = context.app.get<typeof Errors>(getModelToken(Errors));
    await errorsModel.bulkCreate(
      [
        {
          applicationId: firstApplication.id,
          error: 'Critical current week',
          level: 'critical',
          createdAt: thisWeekDate,
        },
        {
          applicationId: firstApplication.id,
          error: 'Fatal current week',
          level: 'fatal',
          createdAt: thisWeekDate,
        },
        {
          applicationId: secondApplication.id,
          error: 'Regular current week',
          level: 'error',
          createdAt: thisWeekDate,
        },
        {
          applicationId: firstApplication.id,
          error: 'Prior week one',
          level: 'error',
          createdAt: lastWeekDate,
        },
        {
          applicationId: secondApplication.id,
          error: 'Prior week two',
          level: 'error',
          createdAt: lastWeekDate,
        },
      ] as any,
      { individualHooks: true },
    );

    await request(context.httpServer)
      .get('/v0.1/users/dashboard/stats')
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/dashboard/stats')
      .set(authHeader(owner.accessToken))
      .expect(200)
      .expect({
        totalApps: 2,
        sharedApps: 1,
        errorsThisWeek: 3,
        errorChangePercent: 50,
        criticalErrors: 2,
      });
  });
});
