import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('FORTYTWO_CLIENT_ID'),
      clientSecret: configService.get<string>('FORTYTWO_CLIENT_SECRET'),
      callbackURL: configService.get<string>('FORTYTWO_CALLBACK_URL'),
    });
  }


  async validate(_accessToken: string, _refreshToken: string, profile: any) {
    const email = profile.emails?.[0]?.value || '';
    const username = profile.username || profile._json?.login || (email ? email.split('@')[0] : '42user');
    const firstName = profile.name?.givenName || profile._json?.first_name || profile.displayName?.split(' ')[0] || 'User';
    const lastName = profile.name?.familyName || profile._json?.last_name || profile.displayName?.split(' ').slice(1).join(' ') || '42';
    const avatarUrl = profile.photos?.[0]?.value || profile._json?.image?.link || profile._json?.image?.versions?.medium || null;

    return {
      email,
      username,
      firstName,
      lastName,
      fullName: profile.displayName || `${firstName} ${lastName}`.trim(),
      avatarUrl,
      fortyTwoId: String(profile.id),
    };
  }
}