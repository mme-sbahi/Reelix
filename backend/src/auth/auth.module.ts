import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FortyTwoStrategy } from './strategies/fortytwo.strategy';
import { MailModule } from 'src/common/mail/mail.module';

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({}), MailModule],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy, FortyTwoStrategy],
  exports: [AuthService],
})
export class AuthModule {}

