import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // TODO: swap this for a real provider (nodemailer + SMTP, Resend,
  // SendGrid, etc.) before this goes anywhere beyond local dev. Keeping
  // the method signature the same means nothing calling this changes.
  async sendPasswordResetEmail(email: string, resetUrl: string) {
    this.logger.log(`Password reset link for ${email}: ${resetUrl}`);
  }

  async sendVerificationEmail(email: string, verifyUrl: string) {
    this.logger.log(`Email verification link for ${email}: ${verifyUrl}`);
  }
}