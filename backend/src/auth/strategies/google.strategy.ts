import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value || '';
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
    const avatarUrl = profile.photos?.[0]?.value || null;
    const baseUsername = (email ? email.split('@')[0] : 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);

    const googleUser = {
      email,
      firstName,
      lastName,
      username: baseUsername,
      fullName: profile.displayName || `${firstName} ${lastName}`.trim(),
      avatarUrl,
      googleId: profile.id,
    };
    done(null, googleUser);
  }
}