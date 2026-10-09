import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

export interface BookingEmailInput {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  providerName: string;
  bookingId: string;
  startAt: string;
  timezone: string;
  durationMinutes: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

@Injectable()
export class BookingEmailService {
  private readonly logger = new Logger(BookingEmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendConfirmation(input: BookingEmailInput): Promise<boolean> {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !from) {
      this.logger.warn('Booking email skipped because SMTP_HOST or SMTP_FROM is not configured');
      return false;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    const dateTime = new Intl.DateTimeFormat('en', {
      dateStyle: 'full', timeStyle: 'short', timeZone: input.timezone,
    }).format(new Date(input.startAt));
    const values = {
      customerName: escapeHtml(input.customerName),
      businessName: escapeHtml(input.businessName),
      serviceName: escapeHtml(input.serviceName),
      providerName: escapeHtml(input.providerName),
      dateTime: escapeHtml(dateTime),
      bookingId: escapeHtml(input.bookingId),
      duration: String(input.durationMinutes),
    };

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: `Appointment confirmed with ${input.businessName}`,
        text: `Hello ${input.customerName}, your ${input.serviceName} appointment with ${input.providerName} at ${input.businessName} is confirmed for ${dateTime}. Duration: ${input.durationMinutes} minutes. Reference: ${input.bookingId}.`,
        html: `<p>Hello ${values.customerName},</p><p>Your <strong>${values.serviceName}</strong> appointment with ${values.providerName} at ${values.businessName} is confirmed.</p><p>${values.dateTime}<br>Duration: ${values.duration} minutes<br>Reference: ${values.bookingId}</p>`,
      });
      return true;
    } catch {
      this.logger.error('Booking was saved, but confirmation email delivery failed');
      return false;
    }
  }
}