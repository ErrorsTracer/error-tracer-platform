import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';
import { UpdatePasswordDto, UpdateUserInfoDto } from './users.dto';

@Controller({ path: 'users', version: '0.1' })
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/profile')
  async getUserInfo(@Req() req: any) {
    return await this.usersService.getUserInfo(req.user);
  }

  @Patch('/profile')
  async updateUserInfo(@Body() data: UpdateUserInfoDto, @Req() req: any) {
    return await this.usersService.updateUserInfo(data, req.user);
  }

  @Patch('/password')
  async updatePassword(@Body() data: UpdatePasswordDto, @Req() req: any) {
    return await this.usersService.updatePassword(data, req.user);
  }

  @Get('/notifications')
  async getUserNotifications(@Req() req: any) {
    return await this.usersService.getUserNotifications(req.user);
  }

  @Get('/usage')
  async getUserUsage(@Req() req: any) {
    return await this.usersService.getUserUsage(req.user);
  }

  @Get('/membership-invitations')
  async getMembershipInvitations(@Req() req: any) {
    return await this.usersService.getMembershipInvitations(req.user);
  }

  @Patch('/membership-invitations/:id/accept')
  async acceptMembershipInvitation(@Param() params: any, @Req() req: any) {
    return await this.usersService.acceptMembershipInvitation(params, req.user);
  }

  @Get('/dashboard/stats')
  async getDashboardStats(@Req() req: any) {
    return await this.usersService.getDashboardStats(req.user);
  }

  @Patch('/notifications/:id/read')
  async markNotificationAsRead(@Param() params: any, @Req() req: any) {
    return await this.usersService.markNotificationAsRead(params, req.user);
  }
}
