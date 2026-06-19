import { Sequelize } from 'sequelize-typescript';
import { ApplicationMembership } from '../../src/database/models/application-membership.model';
import { Frameworks } from '../../src/database/models/frameworks.model';
import { Applications } from '../../src/database/models/applications.model';
import { AuthSessions } from '../../src/database/models/auth-sessions.model';
import { Environments } from '../../src/database/models/environments.model';
import { Errors } from '../../src/database/models/errors.model';
import { Usage } from '../../src/database/models/usage.model';
import { Notifications } from '../../src/database/models/notifications.model';
import { Users } from '../../src/database/models/users.model';

export const testModels = [
  Users,
  Frameworks,
  Applications,
  ApplicationMembership,
  Environments,
  Notifications,
  Errors,
  Usage,
  AuthSessions,
];

export function createTestSequelize() {
  return new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    models: testModels,
    logging: false,
  });
}
