import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LocalizationService } from '../localization/localization.service';
import { SupportedLocale } from '../localization/locales';
import { ApiLoggerService } from '../logging/api-logger.service';
import {
  getDurationMs,
  TrackedRequest,
} from '../logging/request-logging.middleware';

@Catch()
export class ApiErrorBoundaryFilter implements ExceptionFilter {
  constructor(
    private readonly localizationService: LocalizationService,
    private readonly logger: ApiLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<TrackedRequest>();
    const response = ctx.getResponse<Response>();
    const status = this.getStatus(exception);
    const locale = this.localizationService.getLocaleFromRequest(request);
    const requestId = request.requestId ?? 'untracked';
    const timestamp = new Date().toISOString();

    this.logger.logFailure(
      {
        requestId,
        method: request.method,
        url: request.originalUrl ?? request.url,
        statusCode: status,
        durationMs: getDurationMs(request.requestStartedAt),
        ip: request.ip,
        userAgent: request.get('user-agent'),
      },
      exception,
      request,
    );

    response.status(status).json(
      this.localizeResponse(exception, locale, {
        statusCode: status,
        path: request.url,
        timestamp,
        requestId,
      }),
    );
  }

  private getStatus(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (this.hasHttpStatus(exception)) {
      return (
        exception.statusCode ??
        exception.status ??
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private localizeResponse(
    exception: unknown,
    locale: SupportedLocale,
    meta: {
      statusCode: number;
      path: string;
      timestamp: string;
      requestId: string;
    },
  ) {
    if (!(exception instanceof HttpException)) {
      return {
        ...meta,
        message:
          this.hasHttpStatus(exception) && exception.message
            ? exception.message
            : 'Internal server error',
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        ...meta,
        message: this.translateMessage(exceptionResponse, locale),
      };
    }

    const body = exceptionResponse as Record<string, unknown>;
    const message = body.message ?? exception.message;

    return {
      ...body,
      ...meta,
      message: Array.isArray(message)
        ? message.map((item) => this.translateMessage(item, locale))
        : this.translateMessage(message, locale),
    };
  }

  private translateMessage(message: unknown, locale: SupportedLocale) {
    if (!this.localizationService.isTranslationKey(message)) {
      return message;
    }

    return this.localizationService.translate(message, locale);
  }

  private hasHttpStatus(
    exception: unknown,
  ): exception is { status?: number; statusCode?: number; message?: string } {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const maybeException = exception as {
      status?: unknown;
      statusCode?: unknown;
    };

    return (
      typeof maybeException.status === 'number' ||
      typeof maybeException.statusCode === 'number'
    );
  }
}
