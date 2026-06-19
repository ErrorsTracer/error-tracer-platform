import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { Users } from '../../database/models/users.model';
import { AuthRepository } from './auth.repo';
import { AuthSessions } from '../../database/models/auth-sessions.model';
import { RefreshTokenGuard } from './refresh-token.guard';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    SequelizeModule.forFeature([Users, AuthSessions]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET?.toString(),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard, RefreshTokenGuard],
  exports: [AuthGuard, RefreshTokenGuard, AuthRepository],
})
export class AuthModule {}
