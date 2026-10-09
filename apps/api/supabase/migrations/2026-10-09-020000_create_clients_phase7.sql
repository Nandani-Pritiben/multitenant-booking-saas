-- Phase 7: CRM / Clients

-- ── clients table ────────────────────────────────────────────────
CREATE TABLE public.clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  email       TEXT        NULL,
  phone       TEXT        NULL,
  notes       TEXT        NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant-scoped indexes
CREATE INDEX clients_business_id_idx       ON public.clients(business_id);
CREATE INDEX clients_business_email_idx    ON public.clients(business_id, email) WHERE email IS NOT NULL;
CREATE INDEX clients_business_phone_idx    ON public.clients(business_id, phone) WHERE phone IS NOT NULL;

-- Prevent duplicate client for same (business, email) pair
CREATE UNIQUE INDEX clients_business_email_unique_idx
  ON public.clients(business_id, lower(email))
  WHERE email IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can access business clients" ON public.clients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members m
      WHERE m.business_id = clients.business_id
        AND m.user_id     = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members m
      WHERE m.business_id = clients.business_id
        AND m.user_id     = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;

-- ── Add client_id to bookings (nullable — safe for existing rows) ─
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_id UUID NULL REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_client_id_idx ON public.bookings(client_id);

-- ── Helper function: upsert client within a business ─────────────
-- Used by the booking creation trigger; runs as SECURITY DEFINER so
-- the admin insert path can resolve/create the client.
CREATE OR REPLACE FUNCTION public.upsert_client_for_booking(
  p_business_id UUID,
  p_name        TEXT,
  p_email       TEXT,
  p_phone       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Try to find an existing client for this business by email (case-insensitive)
  IF p_email IS NOT NULL AND length(trim(p_email)) > 0 THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE business_id = p_business_id
      AND lower(email) = lower(p_email)
    LIMIT 1;
  END IF;

  -- If not found by email, try phone
  IF v_client_id IS NULL AND p_phone IS NOT NULL AND length(trim(p_phone)) > 0 THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE business_id = p_business_id
      AND phone = p_phone
    LIMIT 1;
  END IF;

  -- Create if still not found
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (business_id, name, email, phone)
    VALUES (p_business_id, p_name, NULLIF(trim(p_email), ''), NULLIF(trim(p_phone), ''))
    RETURNING id INTO v_client_id;
  ELSE
    -- Update name/phone if they changed (keep email as the key, don't downgrade it)
    UPDATE public.clients SET
      name       = p_name,
      phone      = COALESCE(NULLIF(trim(p_phone), ''), phone),
      updated_at = now()
    WHERE id = v_client_id;
  END IF;

  RETURN v_client_id;
END;
$$;

REVOKE ALL  ON FUNCTION public.upsert_client_for_booking(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_client_for_booking(UUID, TEXT, TEXT, TEXT) TO authenticated;
-- Also grant to service_role so the admin Supabase client can call it
GRANT EXECUTE ON FUNCTION public.upsert_client_for_booking(UUID, TEXT, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
