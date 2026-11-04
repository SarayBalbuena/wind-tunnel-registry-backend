import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private configService: ConfigService) {}

  async sendMagicLink(email: string, link: string): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');

    if (!host) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('SMTP_HOST is not configured');
      }
      // Dev only: no SMTP configured, so print the link instead of emailing it.
      this.logger.warn(`SMTP_HOST not set. Magic link for ${email}: ${link}`);
      return;
    }

    await this.getTransporter(host).sendMail({
      from: this.configService.getOrThrow<string>('MAIL_FROM'),
      to: email,
      subject: 'Your login link',
      text: `Use this link to log in (valid for 15 minutes):\n\n${link}\n\nIf you did not request it, ignore this email.`,
      html: `<p>Use this link to log in (valid for 15 minutes):</p><p><a href="${link}">Log in</a></p><p>If you did not request it, ignore this email.</p>`,
    });
  }

  private getTransporter(host: string): Transporter {
    if (!this.transporter) {
      const user = this.configService.get<string>('SMTP_USER');
      const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: user
          ? {
              user,
              pass: this.configService.getOrThrow<string>('SMTP_PASS'),
            }
          : undefined,
      });
    }
    return this.transporter;
  }
}
