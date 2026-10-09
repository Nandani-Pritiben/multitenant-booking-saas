-- Phase 9: Demo Billing — subscriptions table
-- tenant_id references businesses.id (the existing tenant table)

CREATE TABLE public.subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan        TEXT        NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'pro')),
  status      TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NULL,       -- NULL means no expiry (free plan)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A tenant can have at most one active/non-cancelled subscription at a time
  CONSTRAINT subscriptions_one_active_per_tenant
    EXCLUDE USING gist (
      tenant_id WITH =,
      tstzrange(started_at, COALESCE(expires_at, 'infinity'::timestamptz), '[)') WITH &&
    )
    WHERE (status = 'active' AND plan = 'pro')
);

CREATE INDEX subscriptions_tenant_id_idx ON public.subscriptions(tenant_id);
CREATE INDEX subscriptions_status_idx    ON public.subscriptions(status);
CREATE INDEX subscriptions_plan_idx      ON public.subscriptions(plan);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Any member (owner or admin) can read their own tenant's subscription
CREATE POLICY "Members can read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members m
      WHERE m.business_id = subscriptions.tenant_id
        AND m.user_id     = (SELECT auth.uid())
        AND m.role        IN ('owner', 'admin')
    )
  );

-- Only owners can insert/update/delete subscriptions
CREATE POLICY "Owners can manage subscription" ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members m
      WHERE m.business_id = subscriptions.tenant_id
        AND m.user_id     = (SELECT auth.uid())
        AND m.role        = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members m
      WHERE m.business_id = subscriptions.tenant_id
        AND m.user_id     = (SELECT auth.uid())
        AND m.role        = 'owner'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;

NOTIFY pgrst, 'reload schema';
