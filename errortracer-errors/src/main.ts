import { BadRequestException, ValidationPipe, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { ERROR_KEYS } from './common/error-keys';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();
  app.enableCors({ origin: process.env.ORIGIN ?? 'http://localhost:3000', credentials: true });
  app.useGlobalPipes(new ValidationPipe({
    exceptionFactory: (errors: ValidationError[]) => new BadRequestException({
      message: ERROR_KEYS.VALIDATION_FAILED,
      errors: errors.map(({ property, constraints }) => ({ property, constraints })),
    }),
  }));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: [VERSION_NEUTRAL, '0.1'] });

  await app.listen(process.env.ERRORS_APP_PORT ?? 4974);
}

void bootstrap();
