import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Usage } from '../../database/models/usage.model';
import { UsageRepository } from './usage.repo';

@Module({
  imports: [SequelizeModule.forFeature([Usage])],
  providers: [UsageRepository],
  exports: [UsageRepository],
})
export class UsageModule {}
