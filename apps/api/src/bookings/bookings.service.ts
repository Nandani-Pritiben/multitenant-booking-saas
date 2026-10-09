import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AvailabilityService } from '../availability/availability.service.js';
import { ClientsService } from '../clients/clients.service.js';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { localDateAt, localDateTimeToEpoch, nextDate } from '../availability/availability.logic.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { BookingEmailService } from './booking-email.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { SlotUnavailableException } from './slot-unavailable.exception.js';
import type { ListBookingsQueryDto } from './dto/list-bookings-query.dto.js';
import type { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

interface Membership {
  business_id: string;
  role: string;
}

interface DatabaseError {
  code?: string;
}

/** Allowed status transitions: fromStatus → allowedNextStatuses */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['cancelled', 'completed', 'no_show'],
  cancelled: [],
  completed: [],
  no_show: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly availability: AvailabilityService,
    private readonly bookingEmail: BookingEmailService,
    private readonly clientsService: ClientsService,
    private readonly notifications: NotificationsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async createPublic(slug: string, dto: CreateBookingDto) {
    const business = await this.availability.getBusiness(slug);
    const startEpoch = Date.parse(dto.start_at);
    if (!Number.isFinite(startEpoch) || startEpoch <= Date.now()) {
      throw new BadRequestException('Booking time must be in the future');
    }

    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('id,name,duration_minutes,price')
      .eq('id', dto.service_id)
      .eq('business_id', business.id)
      .eq('status', 'active')
      .maybeSingle();
    if (serviceError) this.fail(serviceError);
    if (!service) throw new NotFoundException('Service not found for this business');

    const { data: provider, error: providerError } = await this.supabase.admin
      .from('providers')
      .select('id,name')
      .eq('id', dto.provider_id)
      .eq('business_id', business.id)
      .eq('status', 'active')
      .maybeSingle();
    if (providerError) this.fail(providerError);
    if (!provider) throw new NotFoundException('Provider not found for this business');

    const date = localDateAt(startEpoch, business.timezone);
    const available = await this.availability.getAvailability({
      business_slug: slug,
      service_id: dto.service_id,
      provider_id: dto.provider_id,
      date,
    });
    const normalizedStart = new Date(startEpoch).toISOString();
    if (
      !available.slots.some(
        (slot) => slot.start_at === normalizedStart && slot.provider_id === dto.provider_id,
      )
    ) {
      throw new SlotUnavailableException();
    }

    const endAt = new Date(startEpoch + (service as { duration_minutes: number }).duration_minutes * 60_000).toISOString();

    // Enforce monthly booking limit for this business based on its subscription plan
    await this.entitlements.assertMonthlyBookingLimit(business.id, business.timezone);

    // Resolve or create the client for this business (tenant-scoped by business.id)
    const clientId = await this.clientsService.upsertForBooking(
      business.id,
      dto.customer_name,
      dto.customer_email,
      dto.customer_phone,
    );

    const { data: booking, error: insertError } = await this.supabase.admin
      .from('bookings')
      .insert({
        business_id: business.id,
        service_id: service.id,
        provider_id: provider.id,
        customer_name: dto.customer_name,
        customer_email: dto.customer_email,
        customer_phone: dto.customer_phone,
        start_at: normalizedStart,
        end_at: endAt,
        status: 'confirmed',
        ...(clientId ? { client_id: clientId } : {}),
      })
      .select(
        'id,business_id,service_id,provider_id,customer_name,customer_email,customer_phone,start_at,end_at,status,created_at',
      )
      .single();

    if (insertError) {
      if (insertError.code === '23P01' || insertError.code === '23505') throw new SlotUnavailableException();
      this.fail(insertError);
    }

    // Send confirmation email AFTER booking is committed.
    // Runs fire-and-forget style — email failure never rolls back the booking.
    void this.notifications.sendConfirmation({
      bookingId:      booking.id,
      customerEmail:  dto.customer_email,
      customerName:   dto.customer_name,
      businessName:   business.name,
      serviceName:    (service as { name: string }).name,
      providerName:   (provider as { name: string }).name,
      startAt:        booking.start_at,
      timezone:       business.timezone,
      durationMinutes: (service as { duration_minutes: number }).duration_minutes,
    });

    return booking;
  }

  async listForMember(accessToken: string, query: ListBookingsQueryDto = {}) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Need business timezone for date-only filters
    const { data: business, error: bizError } = await client
      .from('businesses')
      .select('timezone')
      .eq('id', membership.business_id)
      .maybeSingle();
    if (bizError) this.fail(bizError);
    const timezone = (business as { timezone: string } | null)?.timezone ?? 'UTC';

    let queryBuilder = client
      .from('bookings')
      .select(
        'id,customer_name,customer_email,customer_phone,service_id,provider_id,start_at,end_at,status,created_at,services(id,name,duration_minutes,price),providers(id,name)',
      )
      .eq('business_id', membership.business_id);

    // Single date filter: expand to day range in business timezone
    if (query.date) {
      const dayStart = localDateTimeToEpoch(query.date, '00:00', timezone);
      const dayEnd = localDateTimeToEpoch(nextDate(query.date), '00:00', timezone);
      if (dayStart !== null && dayEnd !== null) {
        queryBuilder = queryBuilder
          .gte('start_at', new Date(dayStart).toISOString())
          .lt('start_at', new Date(dayEnd).toISOString());
      }
    } else {
      // Date range filter
      if (query.start_date) {
        // Treat as start of that day in business timezone
        const rangeStart = localDateTimeToEpoch(query.start_date.slice(0, 10), '00:00', timezone);
        if (rangeStart !== null) {
          queryBuilder = queryBuilder.gte('start_at', new Date(rangeStart).toISOString());
        }
      }
      if (query.end_date) {
        // Treat as end of that day (start of next day) in business timezone
        const rangeEnd = localDateTimeToEpoch(nextDate(query.end_date.slice(0, 10)), '00:00', timezone);
        if (rangeEnd !== null) {
          queryBuilder = queryBuilder.lt('start_at', new Date(rangeEnd).toISOString());
        }
      }
    }

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    if (query.provider_id) {
      queryBuilder = queryBuilder.eq('provider_id', query.provider_id);
    }

    if (query.search) {
      // Case-insensitive search across customer name and email using PostgREST ilike
      const term = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      queryBuilder = queryBuilder.or(`customer_name.ilike.${term},customer_email.ilike.${term}`);
    }

    const { data, error } = await queryBuilder.order('start_at', { ascending: true });
    if (error) this.fail(error);
    return data ?? [];
  }

  async listTodayForMember(accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data: business, error: businessError } = await client
      .from('businesses')
      .select('timezone')
      .eq('id', membership.business_id)
      .maybeSingle();
    if (businessError) this.fail(businessError);
    if (!business) throw new NotFoundException('Business not found');
    const timezone = (business as { timezone: string }).timezone;
    const today = localDateAt(Date.now(), timezone);
    const start = localDateTimeToEpoch(today, '00:00', timezone);
    const end = localDateTimeToEpoch(nextDate(today), '00:00', timezone);
    if (start === null || end === null) {
      throw new InternalServerErrorException('Could not resolve business local day');
    }
    const { data, error } = await client
      .from('bookings')
      .select(
        'id,customer_name,customer_email,customer_phone,service_id,provider_id,start_at,end_at,status,services(id,name),providers(id,name)',
      )
      .eq('business_id', membership.business_id)
      .gte('start_at', new Date(start).toISOString())
      .lt('start_at', new Date(end).toISOString())
      .order('start_at', { ascending: true });
    if (error) this.fail(error);
    return { date: today, timezone, bookings: data ?? [] };
  }

  async getForMember(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client
      .from('bookings')
      .select(
        'id,customer_name,customer_email,customer_phone,service_id,provider_id,start_at,end_at,status,created_at,updated_at,services(id,name,duration_minutes,price,currency),providers(id,name),businesses(timezone)',
      )
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Booking not found');
    return data as Record<string, unknown>;
  }

  async updateStatusForMember(id: string, accessToken: string, dto: UpdateBookingStatusDto) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Fetch the current booking to validate the transition
    const { data: existing, error: readError } = await client
      .from('bookings')
      .select('id,status')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (readError) this.fail(readError);
    if (!existing) throw new NotFoundException('Booking not found');

    const currentStatus = (existing as { id: string; status: string }).status;
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${currentStatus}' to '${dto.status}'`,
      );
    }

    const { data, error } = await client
      .from('bookings')
      .update({ status: dto.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select('id,status,updated_at')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Booking not found');

    // Fire-and-forget status update notification
    void this.fetchAndNotifyStatusChange(id, membership.business_id, dto.status as 'cancelled' | 'completed' | 'no_show');

    return data;
  }

  async cancelForMember(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Fetch current status first
    const { data: existing, error: readError } = await client
      .from('bookings')
      .select('id,status')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (readError) this.fail(readError);
    if (!existing) throw new NotFoundException('Booking not found');

    const currentStatus = (existing as { id: string; status: string }).status;
    if (currentStatus === 'cancelled') {
      return existing; // idempotent
    }
    if (currentStatus !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can be cancelled');
    }

    const { data, error } = await client
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select('id,status,updated_at')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Booking not found');

    // Fire-and-forget cancellation notification
    void this.fetchAndNotifyStatusChange(id, membership.business_id, 'cancelled');

    return data;
  }

  /**
   * Fetch full booking details and send a status-change notification email.
   * Always fire-and-forget — never throws, never affects the booking result.
   */
  private async fetchAndNotifyStatusChange(
    bookingId: string,
    businessId: string,
    newStatus: 'cancelled' | 'completed' | 'no_show',
  ): Promise<void> {
    try {
      const { data } = await this.supabase.admin
        .from('bookings')
        .select(
          'customer_name,customer_email,start_at,services(name),providers(name),businesses(name,timezone)',
        )
        .eq('id', bookingId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!data) return;

      const b = data as unknown as {
        customer_name: string;
        customer_email: string;
        start_at: string;
        services: { name: string } | null;
        providers: { name: string } | null;
        businesses: { name: string; timezone: string } | null;
      };

      void this.notifications.sendStatusUpdate({
        bookingId,
        newStatus,
        customerEmail: b.customer_email,
        customerName:  b.customer_name,
        businessName:  b.businesses?.name ?? 'Your business',
        serviceName:   b.services?.name   ?? 'Your appointment',
        providerName:  b.providers?.name  ?? '',
        startAt:       b.start_at,
        timezone:      b.businesses?.timezone ?? 'UTC',
      });
    } catch {
      // Silently swallow — notification failure must never affect the booking
    }
  }

  private async getMembership(client: SupabaseClient): Promise<Membership> {
    const { data, error } = await client
      .from('business_members')
      .select('business_id,role')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('No business membership found');
    const membership = data as unknown as Membership;
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('You cannot manage bookings');
    }
    return membership;
  }

  private fail(error: DatabaseError): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Booking resource not found');
    if (['PGRST202', 'PGRST205', '42703'].includes(error.code ?? '')) {
      throw new ServiceUnavailableException(
        'Booking schema is not initialized. Apply the Phase 5 migration and retry.',
      );
    }
    if (error.code === '23514' || error.code === '22P02') {
      throw new BadRequestException('Invalid booking data');
    }
    throw new InternalServerErrorException('Unable to complete booking request');
  }
}
