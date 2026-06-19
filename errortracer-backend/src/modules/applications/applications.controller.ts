import {
  Controller,
  Get,
  Req,
  UseGuards,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateAppDto,
  GetApplicationErrorsDto,
  GetApplicationTopAffectedRoutesDto,
  InvitePeopleDto,
} from './applications.dto';
import { UnGuard } from '../auth/auth.decorator';
import { ApplicationMembershipGuard } from './application-membership.guard';
import { ApplicationMembershipRequired } from './application-membership.decorator';
import { ApplicationMembershipRole } from '../../common/constants/app.constants';
import { ERROR_KEYS } from '../../common/localization/error-keys';

@Controller({ path: 'applications', version: '0.1' })
@UseGuards(AuthGuard)
export class ApplicationsController {
  constructor(private appService: ApplicationsService) {}

  @Get('/')
  async getApps(@Req() req: any) {
    return await this.appService.getMyApps(req.user);
  }

  @Get('/:id/memberships')
  async getAppMemberships(@Param() params: any, @Req() req: any) {
    return await this.appService.getAppMemberships(params, req.user);
  }

  @UnGuard()
  @Get('/frameworks')
  async getFrameworks() {
    return await this.appService.getFrameworks();
  }

  @Get('/errors/severity-distribution')
  async getErrorsSeverityDistribution(@Req() req: any) {
    return await this.appService.getErrorsSeverityDistribution(req.user);
  }

  @Get('/errors/report')
  async getMyApplicationsErrorsReport(@Req() req: any) {
    return await this.appService.getMyApplicationsErrorsReport(req.user);
  }

  @Get('/errors/recent')
  async getMyApplicationsRecentErrors(
    @Query() query: GetApplicationErrorsDto,
    @Req() req: any,
  ) {
    return await this.appService.getMyApplicationsRecentErrors(
      query,
      req.user,
    );
  }

  @Get('/:id')
  async getAppInfo(@Param() data: any, @Req() req: any) {
    return await this.appService.getAppInfo(data, req.user);
  }

  @Get('/:id/errors')
  async getAppErrors(
    @Param() params: any,
    @Query() query: GetApplicationErrorsDto,
    @Req() req: any,
  ) {
    return await this.appService.getApplicationErrors(params, query, req.user);
  }

  @Get('/:id/errors/recent')
  async getRecentAppErrors(
    @Param() params: any,
    @Query() query: GetApplicationErrorsDto,
    @Req() req: any,
  ) {
    return await this.appService.getRecentApplicationErrors(
      params,
      query,
      req.user,
    );
  }

  @Get('/:id/errors/report')
  async getAppErrorsReport(@Param() params: any, @Req() req: any) {
    return await this.appService.getApplicationErrorsReport(params, req.user);
  }

  @Get('/:id/errors/top-affected-routes')
  async getTopAffectedRoutes(
    @Param() params: any,
    @Query() query: GetApplicationTopAffectedRoutesDto,
    @Req() req: any,
  ) {
    return await this.appService.getApplicationTopAffectedRoutes(
      params,
      query,
      req.user,
    );
  }

  @Get('/:id/usage')
  async getAppUsage(@Param() params: any, @Req() req: any) {
    return await this.appService.getApplicationUsage(params, req.user);
  }

  @Get('/:id/errors/:errorId')
  async getAppErrorDetails(@Param() params: any, @Req() req: any) {
    return await this.appService.getApplicationErrorDetails(params, req.user);
  }

  @Post('/')
  async createApp(@Body() data: CreateAppDto, @Req() req: any) {
    return await this.appService.createApp(data, req.user);
  }

  @Put('/:id/credentials/production')
  @ApplicationMembershipRequired(
    ApplicationMembershipRole.OWNER,
    ERROR_KEYS.APP_STATUS_FORBIDDEN,
  )
  @UseGuards(ApplicationMembershipGuard)
  async updateProductionMode(@Param() params: any, @Req() req: any) {
    return await this.appService.updateProductionMode(params, req.user);
  }

  @Put('/:id/credentials/rotate')
  @ApplicationMembershipRequired(
    ApplicationMembershipRole.OWNER,
    ERROR_KEYS.APP_STATUS_FORBIDDEN,
  )
  @UseGuards(ApplicationMembershipGuard)
  async rotateAppKey(@Param() params: any, @Req() req: any) {
    return await this.appService.rotateAppKey(params, req.user);
  }

  @Get('/:id/credentials')
  async getAppCredentials(@Param() params: any, @Req() req: any) {
    return await this.appService.getAppCredentials(params, req.user);
  }

  @Post('/:id/invite')
  @ApplicationMembershipRequired(
    ApplicationMembershipRole.OWNER,
    ERROR_KEYS.APP_INVITE_FORBIDDEN,
  )
  @UseGuards(ApplicationMembershipGuard)
  async invitePeople(
    @Body() data: InvitePeopleDto,
    @Param() params: any,
    @Req() req: any,
  ) {
    return await this.appService.invitePeople(data, params, req.user);
  }

  @Put('/:id/activate')
  @ApplicationMembershipRequired(
    ApplicationMembershipRole.OWNER,
    ERROR_KEYS.APP_STATUS_FORBIDDEN,
  )
  @UseGuards(ApplicationMembershipGuard)
  async activateApp(@Param() params: any, @Req() req: any) {
    return await this.appService.activateApp(params, req.user);
  }

  @Put('/:id/suspend')
  @ApplicationMembershipRequired(
    ApplicationMembershipRole.OWNER,
    ERROR_KEYS.APP_STATUS_FORBIDDEN,
  )
  @UseGuards(ApplicationMembershipGuard)
  async suspendApp(@Param() params: any, @Req() req: any) {
    return await this.appService.suspendApp(params, req.user);
  }

  @Delete('/:id')
  @ApplicationMembershipRequired(
    ApplicationMembershipRole.OWNER,
    ERROR_KEYS.APP_DELETE_FORBIDDEN,
  )
  @UseGuards(ApplicationMembershipGuard)
  async deleteApp(@Param() params: any, @Req() req: any) {
    return await this.appService.deleteApp(params, req.user);
  }

  // @Put('/:id')
  // async updateApp(@Body() data, @Param() params: any, @Req() req: any) {
  //   return await this.appService.updateApp(data, params, req.user);
  // }

  // @Delete('/:id/membership')
  // async deleteMember(@Param() params: any, @Req() req: any) {
  //   return await this.appService.deleteMember(params, req.user);
  // }

  // @Put('/:id/membership')
  // async deactivateMember(@Param() params: any, @Req() req: any) {
  //   return await this.appService.deactivateMember(params, req.user);
  // }
}
