import { getModelToken } from '@nestjs/sequelize';
import request from 'supertest';
import { Frameworks } from '../../src/database/models/frameworks.model';
import { Environments } from '../../src/database/models/environments.model';
import { AuthSession } from './auth';
import { E2eAppContext } from './e2e-app';
import { authHeader } from './http';

let appCounter = 0;

export type ApplicationFixture = {
  id: string;
  name: string;
  appKey: string;
};

export async function getReactFrameworkId(context: E2eAppContext) {
  const frameworksModel = context.app.get<typeof Frameworks>(
    getModelToken(Frameworks),
  );
  const framework = await frameworksModel.findOne({
    where: { name: 'React.js' },
  });

  if (!framework) {
    throw new Error('React.js framework seed is missing');
  }

  return framework.id;
}

export async function createApplicationFixture(
  context: E2eAppContext,
  owner: AuthSession,
): Promise<ApplicationFixture> {
  appCounter += 1;

  const createResponse = await request(context.httpServer)
    .post('/v0.1/applications')
    .set(authHeader(owner.accessToken))
    .send({
      name: `E2E App ${appCounter}`,
      envName: 'production',
      about: 'Created by e2e tests',
      framework: await getReactFrameworkId(context),
    })
    .expect(201);

  const environmentsModel = context.app.get<typeof Environments>(
    getModelToken(Environments),
  );
  const environment = await environmentsModel.findOne({
    where: { applicationId: createResponse.body.id },
  });

  if (!environment) {
    throw new Error('Application environment was not created');
  }

  return {
    id: createResponse.body.id,
    name: createResponse.body.name,
    appKey: environment.appKey,
  };
}

export async function enableProductionEnvironment(
  context: E2eAppContext,
  owner: AuthSession,
  applicationId: string,
) {
  await request(context.httpServer)
    .put(`/v0.1/applications/${applicationId}/credentials/production`)
    .set(authHeader(owner.accessToken))
    .expect(200);
}

export async function inviteUserToApplication(
  context: E2eAppContext,
  owner: AuthSession,
  applicationId: string,
  invitedEmail: string,
) {
  await request(context.httpServer)
    .post(`/v0.1/applications/${applicationId}/invite`)
    .set(authHeader(owner.accessToken))
    .send({ emails: [invitedEmail] })
    .expect(201);
}
