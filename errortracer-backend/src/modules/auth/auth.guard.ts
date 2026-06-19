import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { ERROR_KEYS } from '../../common/localization/error-keys';
import { AccessTokenPayload, AuthenticatedRequest } from './auth.types';
import { AuthRepository } from './auth.repo';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      throw new UnauthorizedException(ERROR_KEYS.AUTH_REQUIRED);
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        accessToken,
        {
          secret: process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET,
        },
      );
    } catch {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN);
    }

    if (payload.type !== 'access' || !payload.sessionId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN);
    }

    const session = await this.authRepository.findSessionById(
      payload.sessionId,
    );

    if (
      !session ||
      session.revokedAt ||
      new Date(session.expiresAt) <= new Date()
    ) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN);
    }

    request.user = {
      ...payload,
      id: payload.id ?? payload.sub,
    };
    request.session = session;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
