-- Phase 8: Notification logs
-- Tracks every outbound email notification for idempotency and audit.

CREATE TABLE public.notification_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN (
                                'confirmation',
                                'reminder',
                                'cancelled',
                                'completed',
                                'no_show'
                              )),
  recipient_email TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at         TIMESTAMPTZ NULL,
  error_message   TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One notification row per type per booking (idempotency guard)
  CONSTRAINT notification_logs_booking_type_unique UNIQUE (booking_id, type)
);

CREATE INDEX notification_logs_booking_id_idx ON public.notification_logs(booking_id);
CREATE INDEX notification_logs_status_idx     ON public.notification_logs(status);
CREATE INDEX notification_logs_type_idx       ON public.notification_logs(type);

-- ── RLS ──────────────────────────────────────────────────────────
-- Members can read logs for bookings that belong to their business.
-- The backend service_role writes all logs (bypasses RLS).
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their business notification logs"
  ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.bookings        b
      JOIN   public.business_members m ON m.business_id = b.business_id
      WHERE  b.id       = notification_logs.booking_id
        AND  m.user_id  = (SELECT auth.uid())
        AND  m.role     IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.notification_logs TO authenticated;

NOTIFY pgrst, 'reload schema';
