import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OAuthTokenDto } from './dto/oauth-token.dto';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange client credentials or password for an OAuth2 access token',
    description: 'Subject requirement: POST oauth/token - expects client + secret, returns an auth token',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth2 access token issued successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 3600 },
      },
    },
  })
  async issueToken(@Body() dto: OAuthTokenDto) {
    return this.authService.generateOAuthToken(dto);
  }
}
