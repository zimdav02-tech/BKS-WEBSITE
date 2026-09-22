-- Internal booking notes and audit history stay live on the bookings dashboard.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
