-- Enable live fleet and property updates on the Operations Center.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.apartments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
