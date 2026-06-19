import request from 'supertest';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/sequelize';
import { AuthSessions } from '../../src/database/models/auth-sessions.model';
import { loginUser, registerAndLogin, registerUser } from '../support/auth';
import { createE2eApp, E2eAppContext } from '../support/e2e-app';
import { resetTestData } from '../support/db-reset';
import { authHeader } from '../support/http';

describe('Auth API (e2e)', () => {
  let context: E2eAppContext;
  let jwtService: JwtService;
  let authSessionsRepository: typeof AuthSessions;

  beforeAll(async () => {
    context = await createE2eApp();
    jwtService = context.app.get(JwtService);
    authSessionsRepository = context.app.get(getModelToken(AuthSessions));
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('registers users, rejects duplicates, logs in, and refreshes tokens', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');

    await request(context.httpServer)
      .post('/v0.1/auth/register')
      .send({
        firstName: 'Duplicate',
        lastName: 'User',
        email: owner.email,
        password: 'Password123!',
      })
      .expect(422);

    await request(context.httpServer)
      .post('/v0.1/auth/login')
      .send({ email: owner.email, password: 'wrong-password' })
      .expect(401);

    await request(context.httpServer).post('/v0.1/auth/refresh').expect(401);

    const refreshResponse = await request(context.httpServer)
      .post('/v0.1/auth/refresh')
      .set('Cookie', owner.cookie)
      .expect(201);

    expect(refreshResponse.body).toEqual({
      accessToken: expect.any(String),
    });
  });

  it('logs out of the current session', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');

    await request(context.httpServer)
      .post('/v0.1/auth/logout')
      .set('Cookie', owner.cookie)
      .expect(204)
      .expect('set-cookie', /refresh_token=;/);

    await request(context.httpServer)
      .post('/v0.1/auth/refresh')
      .set('Cookie', owner.cookie)
      .expect(401);
  });

  it('lists active sessions for the current user', async () => {
    const user = await registerUser(context.httpServer, 'owner');
    const firstSession = await loginUser(
      context.httpServer,
      user.email,
      user.password,
    );
    const secondSession = await loginUser(
      context.httpServer,
      user.email,
      user.password,
    );
    const firstPayload = jwtService.decode(firstSession.accessToken);
    const secondPayload = jwtService.decode(secondSession.accessToken);

    const response = await request(context.httpServer)
      .get('/v0.1/auth/sessions')
      .set(authHeader(secondSession.accessToken))
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstPayload.sessionId,
          userId: firstPayload.sub,
          revokedAt: null,
          expiresAt: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          isCurrent: false,
        }),
        expect.objectContaining({
          id: secondPayload.sessionId,
          userId: secondPayload.sub,
          revokedAt: null,
          expiresAt: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          isCurrent: true,
        }),
      ]),
    );
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).not.toHaveProperty('refreshTokenHash');
  });

  it('revokes an active session owned by the current user', async () => {
    const user = await registerUser(context.httpServer, 'owner');
    const firstSession = await loginUser(
      context.httpServer,
      user.email,
      user.password,
    );
    const secondSession = await loginUser(
      context.httpServer,
      user.email,
      user.password,
    );
    const firstPayload = jwtService.decode(firstSession.accessToken);

    await request(context.httpServer)
      .delete(`/v0.1/auth/sessions/${firstPayload.sessionId}`)
      .set(authHeader(secondSession.accessToken))
      .expect(204);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(firstSession.accessToken))
      .expect(401);

    const response = await request(context.httpServer)
      .get('/v0.1/auth/sessions')
      .set(authHeader(secondSession.accessToken))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: expect.not.stringMatching(firstPayload.sessionId),
      isCurrent: true,
    });
  });

  it('does not revoke another user session', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');
    const stranger = await registerAndLogin(context.httpServer, 'stranger');
    const ownerPayload = jwtService.decode(owner.accessToken);

    await request(context.httpServer)
      .delete(`/v0.1/auth/sessions/${ownerPayload.sessionId}`)
      .set(authHeader(stranger.accessToken))
      .expect(404);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .expect(200);
  });

  it('requires access tokens for protected API endpoints', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');
    const refreshToken = extractRefreshToken(owner.cookie);

    await request(context.httpServer).get('/v0.1/users/profile').expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader('not-a-valid-access-token'))
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set('Cookie', owner.cookie)
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(refreshToken))
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .expect(200);
  });

  it('rejects revoked refresh tokens after logout', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');
    const payload = jwtService.decode(owner.accessToken);

    expect(payload.sessionId).toEqual(expect.any(String));

    await request(context.httpServer)
      .post('/v0.1/auth/logout')
      .set('Cookie', owner.cookie)
      .expect(204);

    const session = await authSessionsRepository.findByPk(payload.sessionId);
    expect(session?.revokedAt).toBeInstanceOf(Date);

    await request(context.httpServer)
      .post('/v0.1/auth/refresh')
      .set('Cookie', owner.cookie)
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .expect(401);
  });

  it('rejects access tokens with missing or invalid session ids', async () => {
    const owner = await registerAndLogin(context.httpServer, 'owner');

    const missingSessionIdToken = await jwtService.signAsync(
      { sub: 'missing-session-user', type: 'access' },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: '10m',
      },
    );
    const invalidSessionIdToken = await jwtService.signAsync(
      {
        sub: 'missing-session-user',
        sessionId: randomUUID(),
        type: 'access',
      },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: '10m',
      },
    );

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(owner.accessToken))
      .expect(200);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(missingSessionIdToken))
      .expect(401);

    await request(context.httpServer)
      .get('/v0.1/users/profile')
      .set(authHeader(invalidSessionIdToken))
      .expect(401);
  });
});

function extractRefreshToken(cookies: string[]) {
  const cookie = cookies.find((value) => value.startsWith('refresh_token='));
  const match = cookie?.match(/^refresh_token=([^;]+)/);

  if (!match) {
    throw new Error('Expected refresh token cookie');
  }

  return match[1];
}
