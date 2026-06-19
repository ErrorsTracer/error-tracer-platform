import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { ApiLoggerService } from './api-logger.service';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export type TrackedRequest = Request & {
  requestId?: string;
  requestStartedAt?: bigint;
};

export function createRequestLoggingMiddleware(logger: ApiLoggerService) {
  return (request: TrackedRequest, response: Response, next: NextFunction) => {
    const incomingRequestId =
      request.header(REQUEST_ID_HEADER) ??
      request.header(CORRELATION_ID_HEADER);
    const requestId = incomingRequestId?.trim() || randomUUID();

    request.requestId = requestId;
    request.requestStartedAt = process.hrtime.bigint();
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.setHeader(CORRELATION_ID_HEADER, requestId);

    response.on('finish', () => {
      logger.logRequest({
        requestId,
        method: request.method,
        url: request.originalUrl ?? request.url,
        statusCode: response.statusCode,
        durationMs: getDurationMs(request.requestStartedAt),
        ip: request.ip,
        userAgent: request.get('user-agent'),
      });
    });

    next();
  };
}

export function getDurationMs(startedAt?: bigint) {
  if (startedAt === undefined) {
    return undefined;
  }

  return Number((process.hrtime.bigint() - startedAt) / BigInt(1_000_000));
}
