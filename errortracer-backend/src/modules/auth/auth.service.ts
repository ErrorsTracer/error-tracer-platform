import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Users } from '../../database/models/users.model';
import { InjectModel } from '@nestjs/sequelize';
import { comparePassword } from '../../utils/bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateAccountDto } from './auth.dto';
import { AuthRepository } from './auth.repo';

import { randomUUID } from 'crypto';
import { ERROR_KEYS } from '../../common/localization/error-keys';
import { AUTH_CONSTANTS } from '../../common/constants/app.constants';
import { AuthSessionRecord, AuthSessionSummary } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Users)
    private readonly usersRepository: typeof Users,
    private jwtService: JwtService,
    private authRepository: AuthRepository,
  ) {}

  async register(data: CreateAccountDto) {
    const checkEmail = await this.usersRepository.findOne({
      where: {
        email: data.email,
      },
      raw: true,
    });

    if (checkEmail)
      throw new UnprocessableEntityException(ERROR_KEYS.EMAIL_ALREADY_EXISTS);

    await this.usersRepository.create({
      ...data,
    } as any);

    return;
  }

  async login(data: any) {
    const user = await this.authRepository.getUserByEmail(data.email, {
      attributes: {
        include: ['password'],
        exclude: ['createdAt', 'updatedAt', 'avatar', 'firstName', 'lastName'],
      },
    });

    if (!user)
      throw new UnauthorizedException(ERROR_KEYS.INCORRECT_CREDENTIALS);

    try {
      data.password = await comparePassword(
        data.password,
        user.password as string,
      );

      if (!data.password)
        throw new UnauthorizedException(ERROR_KEYS.INCORRECT_CREDENTIALS);

      const sessionId = randomUUID();
      const jwtPayload = {
        sub: user.id,
        id: user.id,
        email: user.email,
        sessionId,
      };

      const accessToken = await this.signAccessToken(jwtPayload);

      const refreshToken = await this.jwtService.signAsync(
        { sub: user.id, sessionId, type: 'refresh' },
        {
          secret: process.env.REFRESH_TOKEN_SECRET,
          expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN,
        },
      );

      await this.authRepository.createSession({
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt: new Date(
          Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
        ),
      });

      return {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };
    } catch {
      throw new UnauthorizedException(ERROR_KEYS.INCORRECT_CREDENTIALS);
    }
  }

  async validateRefreshToken(session: AuthSessionRecord) {
    const accessToken = await this.signAccessToken({
      sub: session.userId,
      id: session.userId,
      email: session.user?.email,
      sessionId: session.id,
    });

    return { accessToken };
  }

  async logout(session: AuthSessionRecord) {
    const revoked = await this.authRepository.revokeSession(session.id);

    if (!revoked) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_REFRESH_TOKEN);
    }
  }

  async listActiveSessions(session: AuthSessionRecord) {
    const sessions = await this.authRepository.listActiveSessionsByUserId(
      session.userId,
    );

    return sessions.map((activeSession: AuthSessionSummary) => ({
      id: activeSession.id,
      userId: activeSession.userId,
      expiresAt: activeSession.expiresAt,
      revokedAt: activeSession.revokedAt,
      createdAt: activeSession.createdAt,
      updatedAt: activeSession.updatedAt,
      isCurrent: activeSession.id === session.id,
    }));
  }

  async revokeUserSession(userId: string, sessionId: string) {
    const revoked = await this.authRepository.revokeUserSession(
      userId,
      sessionId,
    );

    if (!revoked) {
      throw new NotFoundException(ERROR_KEYS.SESSION_NOT_FOUND);
    }
  }

  private async signAccessToken(payload: {
    sub: string;
    id: string;
    email?: string;
    sessionId: string;
  }) {
    return await this.jwtService.signAsync(
      { ...payload, type: 'access' },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      },
    );
  }
}
