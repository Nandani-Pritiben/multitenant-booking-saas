import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private fromAddress = '';
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host     = this.config.get<string>('SMTP_HOST');
    const port     = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user     = this.config.get<string>('SMTP_USER');
    const pass     = this.config.get<string>('SMTP_PASSWORD');
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL');
    const fromName  = this.config.get<string>('SMTP_FROM_NAME') ?? 'Booking SaaS';

    if (!host || !fromEmail) {
      this.logger.warn(
        'Email sending is disabled: SMTP_HOST or SMTP_FROM_EMAIL is not set. ' +
        'Bookings will succeed but no confirmation emails will be sent.',
      );
      return;
    }

    this.fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,   // STARTTLS for 587, TLS for 465
      auth: user && pass ? { user, pass } : undefined,
    });
    this.configured = true;
    this.logger.log(`Email service ready — SMTP host: ${host}:${port}`);
    // Note: we do NOT log user/pass values
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.configured || !this.transporter) {
      this.logger.warn('Email skipped — SMTP not configured');
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      await this.transporter.sendMail({
        from:    this.fromAddress,
        to:      options.to,
        subject: options.subject,
        text:    options.text,
        html:    options.html,
      });
      return { success: true };
    } catch (err) {
      // Log without exposing credentials or full SMTP internals
      const message = err instanceof Error ? err.message : 'Unknown SMTP error';
      this.logger.error(`Email delivery failed: ${message}`);
      return { success: false, error: 'Email delivery failed' };
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }
}
