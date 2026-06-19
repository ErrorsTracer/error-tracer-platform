import request from 'supertest';

let authCounter = 0;

export type AuthSession = {
  accessToken: string;
  cookie: string[];
  email: string;
  password: string;
};

export async function registerUser(
  httpServer: any,
  prefix = 'user',
): Promise<{ email: string; password: string }> {
  authCounter += 1;
  const email = `${prefix}-${authCounter}@example.com`;
  const password = 'Password123!';

  await request(httpServer)
    .post('/v0.1/auth/register')
    .send({
      firstName: prefix,
      lastName: 'User',
      email,
      password,
    })
    .expect(201);

  return { email, password };
}

export async function loginUser(
  httpServer: any,
  email: string,
  password: string,
): Promise<AuthSession> {
  const loginResponse = await request(httpServer)
    .post('/v0.1/auth/login')
    .send({ email, password })
    .expect(201);

  expect(loginResponse.body).toEqual({
    accessToken: expect.any(String),
  });

  const setCookie = loginResponse.headers['set-cookie'];
  expect(setCookie).toBeDefined();

  return {
    accessToken: loginResponse.body.accessToken,
    cookie: Array.isArray(setCookie) ? setCookie : [setCookie],
    email,
    password,
  };
}

export async function registerAndLogin(
  httpServer: any,
  prefix = 'user',
): Promise<AuthSession> {
  const user = await registerUser(httpServer, prefix);

  return await loginUser(httpServer, user.email, user.password);
}
