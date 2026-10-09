import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { EmailService } from './email.service.js';
import { EmailTemplatesService } from './email-templates.service.js';
import type { StatusUpdateTemplateData } from './email-templates.service.js';

export interface SendConfirmationInput {
  bookingId: string;
  customerEmail: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  providerName: string;
  startAt: string;
  timezone: string;
  durationMinutes: number;
}

export interface SendStatusUpdateInput {
  bookingId: string;
  newStatus: StatusUpdateTemplateData['newStatus'];
  customerEmail: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  providerName: string;
  startAt: string;
  timezone: string;
}

type NotificationType = 'confirmation' | 'cancelled' | 'completed' | 'no_show';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly email: EmailService,
    private readonly templates: EmailTemplatesService,
  ) {}

  // ── Booking confirmation ─────────────────────────────────────────

  async sendConfirmation(input: SendConfirmationInput): Promise<boolean> {
    // Idempotency: skip if already sent
    if (await this.alreadySent(input.bookingId, 'confirmation')) return true;

    const logId = await this.upsertLog(input.bookingId, input.customerEmail, 'confirmation', 'pending');
    if (!logId) return false;

    const dateTime = this.formatDateTime(input.startAt, input.timezone);

    const result = await this.email.send({
      to:      input.customerEmail,
      subject: this.templates.confirmationSubject(input.businessName),
      text:    this.templates.confirmationText({
        customerName:    input.customerName,
        businessName:    input.businessName,
        serviceName:     input.serviceName,
        providerName:    input.providerName,
        dateTime,
        durationMinutes: input.durationMinutes,
        bookingReference: input.bookingId.slice(0, 8).toUpperCase(),
      }),
      html:    this.templates.confirmationHtml({
        customerName:    input.customerName,
        businessName:    input.businessName,
        serviceName:     input.serviceName,
        providerName:    input.providerName,
        dateTime,
        durationMinutes: input.durationMinutes,
        bookingReference: input.bookingId.slice(0, 8).toUpperCase(),
      }),
    });

    await this.updateLog(logId, result.success, result.error);
    return result.success;
  }

  // ── Status change (cancelled / completed / no_show) ──────────────

  async sendStatusUpdate(input: SendStatusUpdateInput): Promise<boolean> {
    const type: NotificationType = input.newStatus;

    // Idempotency: skip if already sent for this status
    if (await this.alreadySent(input.bookingId, type)) return true;

    const logId = await this.upsertLog(input.bookingId, input.customerEmail, type, 'pending');
    if (!logId) return false;

    const dateTime = this.formatDateTime(input.startAt, input.timezone);
    const ref      = input.bookingId.slice(0, 8).toUpperCase();

    const result = await this.email.send({
      to:      input.customerEmail,
      subject: this.templates.statusUpdateSubject(input.businessName, input.newStatus),
      text:    this.templates.statusUpdateText({
        customerName:    input.customerName,
        businessName:    input.businessName,
        serviceName:     input.serviceName,
        providerName:    input.providerName,
        dateTime,
        bookingReference: ref,
        newStatus:       input.newStatus,
      }),
      html:    this.templates.statusUpdateHtml({
        customerName:    input.customerName,
        businessName:    input.businessName,
        serviceName:     input.serviceName,
        providerName:    input.providerName,
        dateTime,
        bookingReference: ref,
        newStatus:       input.newStatus,
      }),
    });

    await this.updateLog(logId, result.success, result.error);
    return result.success;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private formatDateTime(startAt: string, timezone: string): string {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone:  timezone,
    }).format(new Date(startAt));
  }

  private async alreadySent(bookingId: string, type: NotificationType): Promise<boolean> {
    const { data } = await this.supabase.admin
      .from('notification_logs')
      .select('status')
      .eq('booking_id', bookingId)
      .eq('type', type)
      .maybeSingle();
    if (!data) return false;
    const sent = (data as { status: string }).status === 'sent';
    if (sent) this.logger.log(`${type} already sent for booking ${bookingId} — skipping`);
    return sent;
  }

  private async upsertLog(
    bookingId: string,
    recipientEmail: string,
    type: NotificationType,
    status: 'pending' | 'sent' | 'failed',
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.admin
        .from('notification_logs')
        .upsert(
          { booking_id: bookingId, type, recipient_email: recipientEmail, status, updated_at: new Date().toISOString() },
          { onConflict: 'booking_id,type', ignoreDuplicates: false },
        )
        .select('id')
        .single();
      if (error) { this.logger.error(`Failed to create notification log: ${error.message}`); return null; }
      return (data as { id: string }).id;
    } catch (err) {
      this.logger.error(`Unexpected log error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private async updateLog(logId: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      await this.supabase.admin
        .from('notification_logs')
        .update({
          status:        success ? 'sent' : 'failed',
          sent_at:       success ? new Date().toISOString() : null,
          error_message: success ? null : (errorMessage ?? 'Unknown error'),
          updated_at:    new Date().toISOString(),
        })
        .eq('id', logId);
    } catch (err) {
      this.logger.error(`Failed to update log ${logId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
