import { Injectable } from '@nestjs/common';
import { Users } from '../../database/models/users.model';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';

import { AuthSessions } from '../../database/models/auth-sessions.model';

type QueryOptions = { attributes: { include?: string[]; exclude?: string[] } };
type CreateSessionInput = {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
};

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(Users)
    private readonly usersRepository: typeof Users,
    @InjectModel(AuthSessions)
    private readonly authSessionsRepository: typeof AuthSessions,
  ) {}

  async getUserByEmail(email: string, queryOptions?: QueryOptions) {
    const user = await this.usersRepository.findOne({
      where: { email },
      attributes: {
        include: queryOptions?.attributes.include || [],
        exclude: queryOptions?.attributes.exclude || [],
      },
    });

    return user?.toJSON();
  }

  async createSession({
    id,
    userId,
    refreshToken,
    expiresAt,
  }: CreateSessionInput) {
    const result = await this.authSessionsRepository.create({
      id,
      userId,
      refreshTokenHash: AuthSessions.hashRefreshToken(refreshToken),
      revokedAt: null,
      expiresAt,
    } as any);

    return result?.toJSON();
  }

  async findSessionById(sessionId: string) {
    const session = await this.authSessionsRepository.findByPk(sessionId, {
      include: [{ model: Users, attributes: ['id', 'email'] }],
    });

    return session?.toJSON();
  }

  async listActiveSessionsByUserId(userId: string) {
    const sessions = await this.authSessionsRepository.findAll({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      attributes: {
        exclude: ['refreshTokenHash'],
      },
      order: [['createdAt', 'DESC']],
    });

    return sessions.map((session) => session.toJSON());
  }

  async revokeSession(sessionId: string) {
    const [affectedCount] = await this.authSessionsRepository.update(
      { revokedAt: new Date() },
      {
        where: {
          id: sessionId,
          revokedAt: null,
        },
      },
    );

    return affectedCount > 0;
  }

  async revokeUserSession(userId: string, sessionId: string) {
    const [affectedCount] = await this.authSessionsRepository.update(
      { revokedAt: new Date() },
      {
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
        },
      },
    );

    return affectedCount > 0;
  }
}
