import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BookingsController, PublicBookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { BookingEmailService } from './booking-email.service.js';

@Module({
  imports: [AvailabilityModule, BillingModule, ClientsModule, NotificationsModule],
  controllers: [BookingsController, PublicBookingsController],
  providers: [BookingsService, BookingEmailService, CurrentUserGuard],
})
export class BookingsModule {}
