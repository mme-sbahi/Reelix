import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'meryeme@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @Length(8, 72)
  password: string;

  @ApiProperty({ example: 'Meryy0909' })
  @IsString()
  @Length(2, 10)
  username: string;

  @ApiProperty({ example: 'Meryeme' })
  @IsString()
  @Length(2, 15)
  firstName: string;

  @ApiProperty({ example: 'El Amrani' })
  @IsString()
  @Length(2, 15)
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
