import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Meryeme' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @ApiProperty({ required: false, example: 'El Amrani' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @ApiProperty({ required: false, example: 'meryy0909' })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  username?: string;

  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: 'Meryeme El Amrani' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @ApiProperty({ required: false, description: 'Profile picture URL / avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false, description: 'Alias for avatarUrl' })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiProperty({ required: false, example: 'NewSecurePassword123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  preferredLanguage?: string;
}