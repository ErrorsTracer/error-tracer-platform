import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAccountDto, LoginDto } from './auth.dto';
import type { Response } from 'express';
import { AUTH_CONSTANTS } from '../../common/constants/app.constants';
import { RefreshTokenGuard } from './refresh-token.guard';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest, RefreshTokenRequest } from './auth.types';

@Controller({ path: 'auth', version: '0.1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() data: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(data);

    res.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      // path: '/auth/login',
      maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
    });

    return { accessToken };
  }

  @Post('register')
  async register(@Body() data: CreateAccountDto) {
    return await this.authService.register(data);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refresh(@Req() req: RefreshTokenRequest) {
    return await this.authService.validateRefreshToken(req.session!);
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async listSessions(@Req() req: AuthenticatedRequest) {
    return await this.authService.listActiveSessions(req.session!);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.authService.revokeUserSession(req.session!.userId, sessionId);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(RefreshTokenGuard)
  async logout(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.session!);

    res.clearCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  }
}
