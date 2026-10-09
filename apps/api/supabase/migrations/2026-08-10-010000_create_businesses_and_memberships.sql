CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id),
  UNIQUE (user_id)
);

CREATE INDEX business_members_business_id_idx ON business_members(business_id);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own business" ON businesses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_members membership
      WHERE membership.business_id = businesses.id
        AND membership.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can update their own business" ON businesses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_members membership
      WHERE membership.business_id = businesses.id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_members membership
      WHERE membership.business_id = businesses.id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'owner'
    )
  );

CREATE POLICY "Users can read their own membership" ON business_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON businesses TO authenticated;
GRANT UPDATE (name, slug, timezone, email, phone, updated_at) ON businesses TO authenticated;
GRANT SELECT ON business_members TO authenticated;

CREATE OR REPLACE FUNCTION create_business_for_current_user(
  p_name TEXT,
  p_slug TEXT,
  p_timezone TEXT DEFAULT 'UTC',
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id UUID := auth.uid();
  new_business_id UUID;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO businesses (name, slug, timezone, email, phone)
  VALUES (p_name, p_slug, p_timezone, p_email, p_phone)
  RETURNING id INTO new_business_id;

  INSERT INTO business_members (business_id, user_id, role)
  VALUES (new_business_id, caller_id, 'owner');

  RETURN new_business_id;
END;
$$;

REVOKE ALL ON FUNCTION create_business_for_current_user(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_business_for_current_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';