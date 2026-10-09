CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX services_business_id_idx ON public.services(business_id);
CREATE INDEX services_business_status_idx ON public.services(business_id, status);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read business services" ON public.services
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = services.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can create business services" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = services.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can update business services" ON public.services
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = services.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = services.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can delete business services" ON public.services
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = services.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
NOTIFY pgrst, 'reload schema';