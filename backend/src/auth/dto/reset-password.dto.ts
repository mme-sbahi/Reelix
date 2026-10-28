import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The raw token from the reset email link' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStrongPassword123!' })
  @IsString()
  @Length(8, 72)
  newPassword: string;
}