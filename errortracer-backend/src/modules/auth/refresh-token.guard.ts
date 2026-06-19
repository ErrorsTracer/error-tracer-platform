import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AUTH_CONSTANTS } from '../../common/constants/app.constants';
import { ERROR_KEYS } from '../../common/localization/error-keys';
import { AuthSessions } from '../../database/models/auth-sessions.model';
import { AuthRepository } from './auth.repo';
import { RefreshTokenPayload, RefreshTokenRequest } from './auth.types';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RefreshTokenRequest>();
    const refreshToken = this.extractRefreshTokenFromCookies(request);

    if (!refreshToken) {
      throw new UnauthorizedException(ERROR_KEYS.NO_REFRESH_TOKEN);
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: process.env.REFRESH_TOKEN_SECRET,
        },
      );
    } catch {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_REFRESH_TOKEN);
    }

    if (payload.type !== 'refresh' || !payload.sessionId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_REFRESH_TOKEN);
    }

    const session = await this.authRepository.findSessionById(
      payload.sessionId,
    );

    if (
      !session ||
      session.revokedAt ||
      new Date(session.expiresAt) <= new Date() ||
      session.refreshTokenHash !== AuthSessions.hashRefreshToken(refreshToken)
    ) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_REFRESH_TOKEN);
    }

    request.refreshToken = refreshToken;
    request.refreshTokenPayload = payload;
    request.session = session;
    return true;
  }

  private extractRefreshTokenFromCookies(
    request: RefreshTokenRequest,
  ): string | undefined {
    return (
      request as RefreshTokenRequest & { cookies?: Record<string, string> }
    ).cookies?.[AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME];
  }
}
