-- Phase 6: Add indexes for common dashboard/calendar queries
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);
CREATE INDEX IF NOT EXISTS bookings_start_at_idx ON public.bookings(start_at);
CREATE INDEX IF NOT EXISTS bookings_business_start_at_idx ON public.bookings(business_id, start_at);
CREATE INDEX IF NOT EXISTS bookings_business_status_idx ON public.bookings(business_id, status);

NOTIFY pgrst, 'reload schema';
