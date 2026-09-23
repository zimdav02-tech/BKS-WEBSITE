CREATE TABLE public.apartment_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apartment_blackouts_range_check CHECK (end_date > start_date)
);

GRANT SELECT ON public.apartment_blackouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartment_blackouts TO authenticated;
GRANT ALL ON public.apartment_blackouts TO service_role;

ALTER TABLE public.apartment_blackouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blackouts are viewable by everyone"
  ON public.apartment_blackouts FOR SELECT USING (true);

CREATE POLICY "Staff manage blackouts"
  ON public.apartment_blackouts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_apartment_blackouts_updated_at
  BEFORE UPDATE ON public.apartment_blackouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_apartment_blackouts_apartment ON public.apartment_blackouts(apartment_id, start_date, end_date);
CREATE INDEX idx_booking_services_apartment_dates ON public.booking_services(apartment_id, start_at, end_at);

-- Busy ranges (bookings that are not cancelled + manual blackouts)
CREATE OR REPLACE FUNCTION public.apartment_busy_ranges(_apartment_id uuid)
RETURNS TABLE (start_at timestamptz, end_at timestamptz, source text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bs.start_at, bs.end_at, 'booking'::text
  FROM public.booking_services bs
  JOIN public.bookings b ON b.id = bs.booking_id
  WHERE bs.apartment_id = _apartment_id
    AND bs.kind = 'apartment'
    AND bs.start_at IS NOT NULL
    AND bs.end_at IS NOT NULL
    AND b.status <> 'cancelled'
  UNION ALL
  SELECT ab.start_date::timestamptz, ab.end_date::timestamptz, 'blackout'::text
  FROM public.apartment_blackouts ab
  WHERE ab.apartment_id = _apartment_id;
$$;

REVOKE ALL ON FUNCTION public.apartment_busy_ranges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apartment_busy_ranges(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_apartment_available(
  _apartment_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_service_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.booking_services bs
    JOIN public.bookings b ON b.id = bs.booking_id
    WHERE bs.apartment_id = _apartment_id
      AND bs.kind = 'apartment'
      AND bs.start_at IS NOT NULL AND bs.end_at IS NOT NULL
      AND b.status <> 'cancelled'
      AND (_exclude_service_id IS NULL OR bs.id <> _exclude_service_id)
      AND bs.start_at < _end AND bs.end_at > _start
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.apartment_blackouts ab
    WHERE ab.apartment_id = _apartment_id
      AND ab.start_date::timestamptz < _end
      AND ab.end_date::timestamptz > _start
  );
$$;

REVOKE ALL ON FUNCTION public.is_apartment_available(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_apartment_available(uuid, timestamptz, timestamptz, uuid) TO anon, authenticated, service_role;

-- Hard guard: reject overlapping apartment bookings at the database level
CREATE OR REPLACE FUNCTION public.booking_services_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'apartment'
     AND NEW.apartment_id IS NOT NULL
     AND NEW.start_at IS NOT NULL
     AND NEW.end_at IS NOT NULL THEN
    IF NOT public.is_apartment_available(NEW.apartment_id, NEW.start_at, NEW.end_at, NEW.id) THEN
      RAISE EXCEPTION 'These dates are no longer available for this apartment'
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.booking_services_no_overlap() FROM PUBLIC;

CREATE TRIGGER booking_services_no_overlap_trg
  BEFORE INSERT OR UPDATE OF apartment_id, start_at, end_at, kind
  ON public.booking_services
  FOR EACH ROW EXECUTE FUNCTION public.booking_services_no_overlap();

-- Blackouts must not collide with existing bookings either
CREATE OR REPLACE FUNCTION public.apartment_blackouts_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.booking_services bs
    JOIN public.bookings b ON b.id = bs.booking_id
    WHERE bs.apartment_id = NEW.apartment_id
      AND bs.kind = 'apartment'
      AND bs.start_at IS NOT NULL AND bs.end_at IS NOT NULL
      AND b.status <> 'cancelled'
      AND bs.start_at < NEW.end_date::timestamptz
      AND bs.end_at > NEW.start_date::timestamptz
  ) THEN
    RAISE EXCEPTION 'An active booking already covers these dates';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apartment_blackouts_no_overlap() FROM PUBLIC;

CREATE TRIGGER apartment_blackouts_no_overlap_trg
  BEFORE INSERT OR UPDATE OF apartment_id, start_date, end_date
  ON public.apartment_blackouts
  FOR EACH ROW EXECUTE FUNCTION public.apartment_blackouts_no_overlap();

ALTER PUBLICATION supabase_realtime ADD TABLE public.apartment_blackouts;