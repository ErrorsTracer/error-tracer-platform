import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from './database/models/application.model';
import { Environment } from './database/models/environment.model';
import { ErrorEvent } from './database/models/error-event.model';
import { Usage } from './database/models/usage.model';
import { ErrorsModule } from './errors/errors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      models: [Application, Environment, ErrorEvent, Usage],
      logging: false,
      synchronize: false,
    }),
    ErrorsModule,
  ],
})
export class AppModule {}
