import { describe, expect, it, vi } from 'vitest';
import { BookingEmailService } from '../../dist/bookings/booking-email.service.js';
import type { ConfigService } from '@nestjs/config';

describe('BookingEmailService', () => {
  it('does not fail booking flow when SMTP is not configured', async () => {
    const config = { get: vi.fn(() => undefined) } as unknown as ConfigService;
    const mailer = new BookingEmailService(config);

    await expect(mailer.sendConfirmation({
      to: 'guest@example.com',
      customerName: 'Guest',
      businessName: 'Studio',
      serviceName: 'Consultation',
      providerName: 'Provider',
      bookingId: 'booking-1',
      startAt: '2026-10-12T10:00:00.000Z',
      timezone: 'UTC',
      durationMinutes: 30,
    })).resolves.toBe(false);
  });
});