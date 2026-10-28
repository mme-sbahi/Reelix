import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express'; 
import { FortyTwoAuthGuard } from './guards/fortytwo.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly configService: ConfigService, private readonly usersService: UsersService,) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: '/',
      maxAge: 15 * 60 * 1000,
    };
    const refreshCookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  }

  private clearAuthCookies(res: Response) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: '/',
    };
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a new account' })
  @ApiCreatedResponse({ description: 'User registered, tokens issued in cookies' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive tokens' })
  @ApiOkResponse({ description: 'Login succeeded, tokens issued in cookies' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new pair' })
  async refresh(
    @CurrentUser('userId') userId: string,
    @CurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshTokens(userId, refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  async logout(@CurrentUser('userId') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(userId);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google for OAuth login' })
  googleLogin() {
    // Passport's GoogleStrategy handles the actual redirect —
    // this method body never runs.
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@CurrentUser() googleUser: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithGoogle(googleUser);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    const frontendUrl = this.configService.get<string>('CORS_ORIGIN');
    res.redirect(`${frontendUrl}/auth/callback`);
  }
  @UseGuards(FortyTwoAuthGuard)
  @Get('42')
  @ApiOperation({ summary: 'Redirect to 42 for OAuth login' })
  fortyTwoLogin() {}

  @UseGuards(FortyTwoAuthGuard)
  @Get('42/callback')
  @ApiOperation({ summary: '42 OAuth callback' })
  async fortyTwoCallback(@CurrentUser() fortyTwoUser: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithFortyTwo(fortyTwoUser);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    const frontendUrl = this.configService.get<string>('CORS_ORIGIN');
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using the token from the verification link' })
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Resend the verification email' })
  async resendVerification(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findByIdOrThrow(userId);
    await this.authService.sendVerificationEmail(user);
    return { success: true };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using the token from the reset link' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
