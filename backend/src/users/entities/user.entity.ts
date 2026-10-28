import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  // Never serialized in API responses
  @Exclude()
  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId?: string;

  @Column({ name: 'forty_two_id', nullable: true, unique: true })
  fortyTwoId?: string;

  @Index({ unique: true })
  @Column({ name: 'username', type: 'varchar', unique: true, nullable: true })
  username?: string | null;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName?: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName?: string | null;

  // Keep fullName as a computed getter for anywhere in your code that
  // still expects it, instead of ripping it out everywhere at once:
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'preferred_language', default: 'en' })
  preferredLanguage: string;

  // Stores a bcrypt hash of the current valid refresh token (rotated on
  // every refresh / cleared on logout). Excluded from responses and from
  // default SELECTs so it's never accidentally leaked.
  @Exclude()
  @Column({
    type: 'varchar',
    name: 'hashed_refresh_token',
    nullable: true,
    select: false,
  })
  hashedRefreshToken?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Email verification
  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Exclude()
  @Column({ type: 'varchar', name: 'email_verification_token_hash', nullable: true })
  emailVerificationTokenHash?: string | null;

  // Password reset
  @Exclude()
  @Column({ type: 'varchar', name: 'reset_password_token_hash', nullable: true })
  resetPasswordTokenHash?: string | null;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date | null;
}
