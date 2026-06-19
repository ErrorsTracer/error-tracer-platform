import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { ApiErrorBoundaryFilter } from '../../src/common/filters/api-error-boundary.filter';
import { ERROR_KEYS } from '../../src/common/localization/error-keys';
import { LocalizationService } from '../../src/common/localization/localization.service';
import { ApiLoggerService } from '../../src/common/logging/api-logger.service';
import { createRequestLoggingMiddleware } from '../../src/common/logging/request-logging.middleware';

export type E2eAppContext = {
  app: INestApplication;
  httpServer: any;
};

export async function createE2eApp(): Promise<E2eAppContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  const apiLogger = new ApiLoggerService({}, []);
  const localizationService = new LocalizationService();

  app.use(createRequestLoggingMiddleware(apiLogger));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: ERROR_KEYS.VALIDATION_FAILED,
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        }),
    }),
  );
  app.useGlobalFilters(
    new ApiErrorBoundaryFilter(localizationService, apiLogger),
  );
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL, '0.1'],
  });

  await app.init();

  return {
    app,
    httpServer: app.getHttpServer(),
  };
}
