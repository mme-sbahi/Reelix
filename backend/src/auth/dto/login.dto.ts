import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'meryy0909' })
  @IsString()
  identifier: string; // username OR email

  @ApiProperty()
  @IsString()
  password: string;
}
