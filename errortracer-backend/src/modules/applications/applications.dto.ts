import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ERROR_LEVELS } from '../errors/errors.dto';

export class CreateAppDto {
  @IsNotEmpty()
  declare name: string;

  @IsNotEmpty()
  @IsString()
  declare envName: string;

  @IsOptional()
  declare about: string;

  @IsNotEmpty()
  @IsUUID()
  declare framework: string;
}

export class InvitePeopleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  declare emails: string[];
}

export class GetApplicationErrorsDto {
  @IsOptional()
  @Matches(/^\d+$/)
  declare limit?: string;

  @IsOptional()
  @IsString()
  declare cursor?: string;
}

export class GetUserApplicationErrorsDto {
  @IsOptional()
  @Matches(/^\d+$/)
  declare limit?: string;

  @IsOptional()
  @IsString()
  declare cursor?: string;

  @IsOptional()
  @IsString()
  @IsIn(ERROR_LEVELS)
  declare level?: string;

  @IsOptional()
  @IsUUID()
  declare applicationId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['lastOccurred', 'topRepeated'])
  declare sort?: 'lastOccurred' | 'topRepeated';
}

export class GetApplicationTopAffectedRoutesDto {
  @IsOptional()
  @Matches(/^\d+$/)
  declare limit?: string;
}
