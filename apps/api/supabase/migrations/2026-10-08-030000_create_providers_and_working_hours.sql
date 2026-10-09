CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX providers_business_id_idx ON public.providers(business_id);
CREATE INDEX providers_business_status_idx ON public.providers(business_id, status);

CREATE TABLE public.provider_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, day_of_week),
  CHECK (start_time < end_time)
);

CREATE INDEX provider_working_hours_provider_id_idx ON public.provider_working_hours(provider_id);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage business providers" ON public.providers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = providers.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members membership
      WHERE membership.business_id = providers.business_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can manage working hours for their providers" ON public.provider_working_hours
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers provider
      JOIN public.business_members membership ON membership.business_id = provider.business_id
      WHERE provider.id = provider_working_hours.provider_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.providers provider
      JOIN public.business_members membership ON membership.business_id = provider.business_id
      WHERE provider.id = provider_working_hours.provider_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_working_hours TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_provider_working_hours(p_provider_id UUID, p_hours JSONB)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.providers WHERE id = p_provider_id) THEN
    RAISE EXCEPTION 'Provider not found or not accessible' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.provider_working_hours WHERE provider_id = p_provider_id;

  INSERT INTO public.provider_working_hours (provider_id, day_of_week, start_time, end_time)
  SELECT p_provider_id, item.day_of_week, item.start_time, item.end_time
  FROM jsonb_to_recordset(p_hours) AS item(day_of_week INTEGER, start_time TIME, end_time TIME);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_provider_working_hours(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_provider_working_hours(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';