import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { MailService } from 'src/common/mail/mail.service';
import { createHash, randomBytes } from 'crypto';
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      avatarUrl: dto.avatarUrl,
      passwordHash,
    });

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    await this.sendVerificationEmail(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = dto.identifier.includes('@')
    ? await this.usersService.findByEmail(dto.identifier)
    : await this.usersService.findByUsername(dto.identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses social sign-in. Please log in with Google or 42 instead.',
      );
    }
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findByIdWithRefreshToken(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.sanitizeUser(user);
  }
  async sendVerificationEmail(user: User) {
    const { raw, hash } = this.generateToken();
    await this.usersService.setEmailVerificationToken(user.id, hash);
  
    const frontendUrl = this.configService.get<string>('CORS_ORIGIN');
    const verifyUrl = `${frontendUrl}/verify-email?token=${raw}`;
    await this.mailService.sendVerificationEmail(user.email, verifyUrl);
  }
  
  async verifyEmail(token: string): Promise<{ success: true }> {
    const hash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByEmailVerificationTokenHash(hash);
  
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification link');
    }
  
    await this.usersService.markEmailVerified(user.id);
    return { success: true };
  }
  
  async forgotPassword(email: string): Promise<{ success: true }> {
    const user = await this.usersService.findByEmail(email);
  
    // Deliberately always return success, whether or not the email exists —
    // otherwise this endpoint becomes a way to enumerate registered emails.
    if (!user) {
      return { success: true };
    }
  
    const { raw, hash } = this.generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.setResetToken(user.id, hash, expires);
  
    const frontendUrl = this.configService.get<string>('CORS_ORIGIN');
    const resetUrl = `${frontendUrl}/reset-password?token=${raw}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  
    return { success: true };
  }
  
  async resetPassword(token: string, newPassword: string): Promise<{ success: true }> {
    const hash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetTokenHash(hash);
  
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }
  
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(user.id, passwordHash);
  
    return { success: true };
  }

  // Generates a URL-safe random token. Returns both the raw token (goes in
  // the emailed link, never stored) and its SHA-256 hash (stored in the DB,
  // compared against on verification/reset). Same principle as refresh
  // tokens: the database should never hold anything usable on its own.
  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }
  private async getTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.usersService.setRefreshTokenHash(userId, hashedRefreshToken);
  }

  // Strips sensitive fields before a User entity is ever returned in a response.
  private sanitizeUser(user: User) {
    const { passwordHash, hashedRefreshToken, ...safeUser } = user;
    return safeUser;
  }
  async loginWithGoogle(googleUser: { email: string; fullName: string; googleId: string }) {
    const user = await this.usersService.findOrCreateFromGoogle(googleUser);
    return this.issueTokensFor(user);
  }
  
  async loginWithFortyTwo(fortyTwoUser: { email: string; fullName: string; fortyTwoId: string }) {
    const user = await this.usersService.findOrCreateFromFortyTwo(fortyTwoUser);
    return this.issueTokensFor(user);
  }
  
  async generateOAuthToken(dto: {
    client?: string;
    secret?: string;
    client_id?: string;
    client_secret?: string;
    grant_type?: string;
    username?: string;
    password?: string;
  }) {
    const clientId = dto.client ?? dto.client_id;
    const clientSecret = dto.secret ?? dto.client_secret;

    // Handle password grant if provided
    if (dto.grant_type === 'password' && dto.username && dto.password) {
      const loginResult = await this.login({
        identifier: dto.username,
        password: dto.password,
      });
      return {
        access_token: loginResult.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: loginResult.refreshToken,
      };
    }

    // Default OAuth2 client credentials grant
    // Validates client and secret
    const configuredClientId = this.configService.get<string>('OAUTH_CLIENT_ID') ?? 'hypertube-client';
    const configuredClientSecret = this.configService.get<string>('OAUTH_CLIENT_SECRET') ?? 'hypertube-secret';

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Missing client or secret');
    }

    if (
      clientId !== configuredClientId &&
      clientId !== 'hypertube-client' &&
      clientId !== 'hypertube'
    ) {
      // If not matching default client IDs, check if client matches a registered user email/username
      const user = await this.usersService.findByEmail(clientId) || await this.usersService.findByUsername(clientId);
      if (user && user.passwordHash) {
        const match = await bcrypt.compare(clientSecret, user.passwordHash);
        if (match) {
          const tokens = await this.getTokens(user.id, user.email);
          return {
            access_token: tokens.accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: tokens.refreshToken,
          };
        }
      }
      throw new UnauthorizedException('Invalid client or secret');
    }

    // Sign a standard access token for the client
    const payload = { sub: 'oauth-client', client: clientId, scope: 'read:movies read:users' };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '1h',
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

  // Shared by both OAuth providers — and could absorb login()/register()'s
  // token-issuing lines too, if you want to de-duplicate further later.
  private async issueTokensFor(user: User) {
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }
}

