import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

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

export class GetApplicationTopAffectedRoutesDto {
  @IsOptional()
  @Matches(/^\d+$/)
  declare limit?: string;
}
