CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Legacy availability record',
  ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT 'legacy@invalid.example',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT 'not-provided';

UPDATE public.bookings
SET customer_name = COALESCE(NULLIF(trim(customer_name), ''), 'Legacy availability record'),
    customer_email = CASE
      WHEN customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN customer_email
      ELSE 'legacy@invalid.example'
    END,
    customer_phone = COALESCE(NULLIF(trim(customer_phone), ''), 'not-provided')
WHERE customer_name IS NULL OR length(trim(customer_name)) = 0
   OR customer_email IS NULL OR customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   OR customer_phone IS NULL OR length(trim(customer_phone)) = 0;

ALTER TABLE public.bookings
  ALTER COLUMN customer_name SET NOT NULL,
  ALTER COLUMN customer_email SET NOT NULL,
  ALTER COLUMN customer_phone SET NOT NULL,
  ALTER COLUMN customer_name DROP DEFAULT,
  ALTER COLUMN customer_email DROP DEFAULT,
  ALTER COLUMN customer_phone DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_name_not_empty' AND conrelid = 'public.bookings'::regclass) THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_name_not_empty CHECK (length(trim(customer_name)) > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_email_not_empty' AND conrelid = 'public.bookings'::regclass) THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_email_not_empty CHECK (length(trim(customer_email)) > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_phone_not_empty' AND conrelid = 'public.bookings'::regclass) THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_phone_not_empty CHECK (length(trim(customer_phone)) > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_email_format' AND conrelid = 'public.bookings'::regclass) THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_email_format CHECK (customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_provider_no_overlap' AND conrelid = 'public.bookings'::regclass) THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_provider_no_overlap
      EXCLUDE USING gist (
        provider_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status IN ('confirmed', 'completed', 'no_show'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS bookings_customer_email_idx ON public.bookings(customer_email);
NOTIFY pgrst, 'reload schema';