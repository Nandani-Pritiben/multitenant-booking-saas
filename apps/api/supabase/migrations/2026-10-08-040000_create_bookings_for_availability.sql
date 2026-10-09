CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX bookings_business_id_idx ON public.bookings(business_id);
CREATE INDEX bookings_provider_id_idx ON public.bookings(provider_id);
CREATE INDEX bookings_provider_start_at_idx ON public.bookings(provider_id, start_at);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can access business bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = bookings.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = bookings.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
NOTIFY pgrst, 'reload schema';