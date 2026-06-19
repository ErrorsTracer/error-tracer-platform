import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  declare firstName: string;

  @IsNotEmpty()
  @IsString()
  declare lastName: string;

  @IsNotEmpty()
  @IsEmail()
  declare email: string;

  @IsNotEmpty()
  @IsString()
  declare password: string;
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  declare email: string;

  @IsNotEmpty()
  @IsString()
  declare password: string;
}
