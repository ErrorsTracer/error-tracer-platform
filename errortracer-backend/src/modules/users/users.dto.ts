import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserInfoDto {
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  declare firstName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  declare lastName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  declare avatar?: string;
}

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  declare currentPassword: string;

  @IsNotEmpty()
  @IsString()
  declare newPassword: string;

  @IsNotEmpty()
  @IsString()
  declare confirmNewPassword: string;
}
