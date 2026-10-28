import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OAuthTokenDto {
  @ApiProperty({ required: false, description: 'OAuth client identifier' })
  @IsOptional()
  @IsString()
  client?: string;

  @ApiProperty({ required: false, description: 'OAuth client secret' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ required: false, description: 'OAuth client identifier alias' })
  @IsOptional()
  @IsString()
  client_id?: string;

  @ApiProperty({ required: false, description: 'OAuth client secret alias' })
  @IsOptional()
  @IsString()
  client_secret?: string;

  @ApiProperty({ required: false, description: 'OAuth grant type (e.g. client_credentials, password)' })
  @IsOptional()
  @IsString()
  grant_type?: string;

  @ApiProperty({ required: false, description: 'Username for password grant' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false, description: 'Password for password grant' })
  @IsOptional()
  @IsString()
  password?: string;
}
