import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
