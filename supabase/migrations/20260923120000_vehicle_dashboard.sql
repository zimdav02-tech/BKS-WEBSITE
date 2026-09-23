-- Fleet dashboard: vehicle profile fields, live status, maintenance log,
-- and booking-driven availability (available → reserved → assigned/in use → available).

DO $$ BEGIN
  CREATE TYPE public.vehicle_status AS ENUM (
    'available',
    'reserved',
    'assigned',
    'in_use',
    'maintenance',
    'unavailable'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS mileage integer,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS service_hold public.vehicle_status,
  ADD COLUMN IF NOT EXISTS status public.vehicle_status NOT NULL DEFAULT 'available';

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_service_hold_check
    CHECK (service_hold IS NULL OR service_hold = 'maintenance' OR service_hold = 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_year_check CHECK (year IS NULL OR year BETWEEN 1950 AND 2100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_mileage_check CHECK (mileage IS NULL OR mileage >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_hourly_rate_check CHECK (hourly_rate >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_booking_services_vehicle ON public.booking_services (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_airport_transfers_vehicle ON public.airport_transfers (vehicle_id);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL,
  serviced_on date NOT NULL DEFAULT CURRENT_DATE,
  mileage integer,
  cost numeric(12,2),
  currency text NOT NULL DEFAULT 'ZMW',
  next_service_on date,
  status public.maintenance_status NOT NULL DEFAULT 'scheduled',
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_maintenance_mileage_check CHECK (mileage IS NULL OR mileage >= 0),
  CONSTRAINT vehicle_maintenance_cost_check CHECK (cost IS NULL OR cost >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance TO authenticated;
GRANT ALL ON public.vehicle_maintenance TO service_role;

ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Staff manage vehicle maintenance"
    ON public.vehicle_maintenance FOR ALL TO authenticated
    USING (public.is_staff(auth.uid()))
    WITH CHECK (public.is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_vehicle_maintenance_updated ON public.vehicle_maintenance;
CREATE TRIGGER trg_vehicle_maintenance_updated
  BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle
  ON public.vehicle_maintenance (vehicle_id, serviced_on DESC);

-- Resolve the operational status from the service hold, open bookings and transfers.
CREATE OR REPLACE FUNCTION public.compute_vehicle_status(_vehicle_id uuid)
RETURNS public.vehicle_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold public.vehicle_status;
  v_rank integer := 0;
  r record;
  end_ts timestamptz;
  current_window boolean;
BEGIN
  SELECT service_hold INTO v_hold FROM public.vehicles WHERE id = _vehicle_id;
  IF v_hold = 'maintenance' THEN
    RETURN 'maintenance';
  ELSIF v_hold = 'unavailable' THEN
    RETURN 'unavailable';
  END IF;

  FOR r IN
    SELECT b.status, b.start_date, b.end_date, s.start_at, s.end_at
    FROM public.booking_services s
    JOIN public.bookings b ON b.id = s.booking_id
    WHERE s.vehicle_id = _vehicle_id
      AND b.status IN ('pending', 'approved', 'in_progress')
  LOOP
    end_ts := COALESCE(
      r.end_at,
      CASE WHEN r.end_date IS NULL THEN NULL ELSE (r.end_date + 1)::timestamptz END
    );
    IF end_ts IS NOT NULL AND end_ts <= now() THEN
      CONTINUE;
    END IF;

    current_window :=
      (r.start_at IS NOT NULL AND r.start_at <= now() AND (r.end_at IS NULL OR r.end_at >= now()))
      OR (
        r.start_at IS NULL
        AND r.start_date IS NOT NULL
        AND r.start_date <= CURRENT_DATE
        AND (r.end_date IS NULL OR r.end_date >= CURRENT_DATE)
      )
      OR (r.start_at IS NULL AND r.start_date IS NULL AND r.status = 'in_progress');

    IF r.status = 'in_progress' OR (r.status = 'approved' AND current_window) THEN
      v_rank := GREATEST(v_rank, 3);
    ELSIF r.status = 'approved' THEN
      v_rank := GREATEST(v_rank, 2);
    ELSIF r.status = 'pending' THEN
      v_rank := GREATEST(v_rank, 1);
    END IF;
  END LOOP;

  FOR r IN
    SELECT stage, arrival_at
    FROM public.airport_transfers
    WHERE vehicle_id = _vehicle_id
      AND stage <> 'completed'
  LOOP
    IF r.arrival_at IS NOT NULL
       AND r.arrival_at < now() - interval '18 hours'
       AND r.stage = 'flight_scheduled' THEN
      CONTINUE;
    END IF;
    IF r.stage IN ('driver_en_route', 'driver_waiting', 'picked_up') THEN
      v_rank := GREATEST(v_rank, 3);
    ELSIF r.stage = 'driver_assigned' THEN
      v_rank := GREATEST(v_rank, 2);
    ELSIF r.stage = 'flight_scheduled' THEN
      v_rank := GREATEST(v_rank, 1);
    END IF;
  END LOOP;

  IF v_rank >= 3 THEN
    RETURN 'in_use';
  ELSIF v_rank = 2 THEN
    RETURN 'assigned';
  ELSIF v_rank = 1 THEN
    RETURN 'reserved';
  ELSE
    RETURN 'available';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_vehicle_status(_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.vehicle_status;
  v_active boolean;
BEGIN
  IF _vehicle_id IS NULL THEN
    RETURN;
  END IF;
  IF current_setting('bks.vehicle_status_lock', true) = '1' THEN
    RETURN;
  END IF;

  PERFORM set_config('bks.vehicle_status_lock', '1', true);
  v_status := public.compute_vehicle_status(_vehicle_id);
  v_active := v_status NOT IN ('maintenance', 'unavailable');
  UPDATE public.vehicles
  SET status = v_status,
      is_active = v_active
  WHERE id = _vehicle_id
    AND (status IS DISTINCT FROM v_status OR is_active IS DISTINCT FROM v_active);
  PERFORM set_config('bks.vehicle_status_lock', '', true);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('bks.vehicle_status_lock', '', true);
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_vehicles_apply_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.apply_vehicle_status(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_apply_status ON public.vehicles;
CREATE TRIGGER trg_vehicles_apply_status
  AFTER INSERT OR UPDATE OF service_hold
  ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.trg_vehicles_apply_status();

CREATE OR REPLACE FUNCTION public.trg_refresh_vehicle_from_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.apply_vehicle_status(OLD.vehicle_id);
    RETURN OLD;
  END IF;
  PERFORM public.apply_vehicle_status(NEW.vehicle_id);
  IF TG_OP = 'UPDATE' AND OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
    PERFORM public.apply_vehicle_status(OLD.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_vehicle_from_service ON public.booking_services;
CREATE TRIGGER trg_refresh_vehicle_from_service
  AFTER INSERT OR UPDATE OF vehicle_id, start_at, end_at OR DELETE
  ON public.booking_services
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_vehicle_from_service();

CREATE OR REPLACE FUNCTION public.trg_refresh_vehicles_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT vehicle_id FROM public.booking_services
    WHERE booking_id = NEW.id AND vehicle_id IS NOT NULL
    UNION
    SELECT vehicle_id FROM public.airport_transfers
    WHERE booking_id = NEW.id AND vehicle_id IS NOT NULL
  LOOP
    PERFORM public.apply_vehicle_status(v_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_vehicles_from_booking ON public.bookings;
CREATE TRIGGER trg_refresh_vehicles_from_booking
  AFTER UPDATE OF status, stage, start_date, end_date
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_vehicles_from_booking();

CREATE OR REPLACE FUNCTION public.trg_refresh_vehicle_from_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.apply_vehicle_status(OLD.vehicle_id);
    RETURN OLD;
  END IF;
  PERFORM public.apply_vehicle_status(NEW.vehicle_id);
  IF TG_OP = 'UPDATE' AND OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
    PERFORM public.apply_vehicle_status(OLD.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_vehicle_from_transfer ON public.airport_transfers;
CREATE TRIGGER trg_refresh_vehicle_from_transfer
  AFTER INSERT OR UPDATE OF vehicle_id, stage, arrival_at OR DELETE
  ON public.airport_transfers
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_vehicle_from_transfer();

-- Stop a second open assignment from taking a vehicle that is already committed or out of service.
CREATE OR REPLACE FUNCTION public.vehicle_has_conflict(
  _vehicle_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_service_id uuid,
  _exclude_transfer_id uuid,
  _booking_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_services bs
    JOIN public.bookings b ON b.id = bs.booking_id
    WHERE bs.vehicle_id = _vehicle_id
      AND b.status IN ('pending', 'approved', 'in_progress')
      AND (_exclude_service_id IS NULL OR bs.id <> _exclude_service_id)
      AND (
        _exclude_transfer_id IS NULL
        OR b.id IS DISTINCT FROM _booking_id
      )
      AND COALESCE(bs.start_at, b.start_date::timestamptz, '-infinity'::timestamptz) < COALESCE(_end, 'infinity'::timestamptz)
      AND COALESCE(
        bs.end_at,
        CASE WHEN b.end_date IS NULL THEN NULL ELSE (b.end_date + 1)::timestamptz END,
        'infinity'::timestamptz
      ) > COALESCE(_start, '-infinity'::timestamptz)
  ) OR EXISTS (
    SELECT 1
    FROM public.airport_transfers t
    WHERE t.vehicle_id = _vehicle_id
      AND t.stage <> 'completed'
      AND (_exclude_transfer_id IS NULL OR t.id <> _exclude_transfer_id)
      AND (
        _exclude_service_id IS NULL
        OR t.booking_id IS DISTINCT FROM _booking_id
      )
      AND COALESCE(t.arrival_at, '-infinity'::timestamptz) < COALESCE(_end, 'infinity'::timestamptz)
      AND COALESCE(t.arrival_at + interval '12 hours', 'infinity'::timestamptz) > COALESCE(_start, '-infinity'::timestamptz)
  );
$$;

CREATE OR REPLACE FUNCTION public.booking_services_vehicle_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_start_date date;
  v_end_date date;
  v_hold public.vehicle_status;
BEGIN
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT service_hold INTO v_hold FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_hold IN ('maintenance', 'unavailable')
     AND (TG_OP = 'INSERT' OR OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id) THEN
    RAISE EXCEPTION 'This vehicle is in maintenance or out of service'
      USING ERRCODE = '23514';
  END IF;

  SELECT start_date, end_date INTO v_start_date, v_end_date
  FROM public.bookings WHERE id = NEW.booking_id;

  v_start := COALESCE(NEW.start_at, v_start_date::timestamptz);
  v_end := COALESCE(
    NEW.end_at,
    CASE WHEN v_end_date IS NULL THEN NULL ELSE (v_end_date + 1)::timestamptz END
  );

  IF public.vehicle_has_conflict(NEW.vehicle_id, v_start, v_end, NEW.id, NULL, NEW.booking_id) THEN
    RAISE EXCEPTION 'This vehicle is already booked for those dates'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_services_vehicle_guard_trg ON public.booking_services;
CREATE TRIGGER booking_services_vehicle_guard_trg
  BEFORE INSERT OR UPDATE OF vehicle_id, start_at, end_at
  ON public.booking_services
  FOR EACH ROW EXECUTE FUNCTION public.booking_services_vehicle_guard();

CREATE OR REPLACE FUNCTION public.transfers_vehicle_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold public.vehicle_status;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF NEW.vehicle_id IS NULL OR NEW.stage = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT service_hold INTO v_hold FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_hold IN ('maintenance', 'unavailable')
     AND (TG_OP = 'INSERT' OR OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id) THEN
    RAISE EXCEPTION 'This vehicle is in maintenance or out of service'
      USING ERRCODE = '23514';
  END IF;

  v_start := NEW.arrival_at;
  v_end := CASE WHEN NEW.arrival_at IS NULL THEN NULL ELSE NEW.arrival_at + interval '12 hours' END;

  IF public.vehicle_has_conflict(NEW.vehicle_id, v_start, v_end, NULL, NEW.id, NEW.booking_id) THEN
    RAISE EXCEPTION 'This vehicle is already booked for those dates'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transfers_vehicle_guard_trg ON public.airport_transfers;
CREATE TRIGGER transfers_vehicle_guard_trg
  BEFORE INSERT OR UPDATE OF vehicle_id, arrival_at, stage
  ON public.airport_transfers
  FOR EACH ROW EXECUTE FUNCTION public.transfers_vehicle_guard();

REVOKE ALL ON FUNCTION public.compute_vehicle_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_vehicle_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_vehicles_apply_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_refresh_vehicle_from_service() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_refresh_vehicles_from_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_refresh_vehicle_from_transfer() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vehicle_has_conflict(uuid, timestamptz, timestamptz, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_services_vehicle_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfers_vehicle_guard() FROM PUBLIC, anon, authenticated;

-- Vehicles already out of service stay out of service.
UPDATE public.vehicles
SET service_hold = 'maintenance'
WHERE is_active = false AND service_hold IS NULL;

SELECT public.apply_vehicle_status(id) FROM public.vehicles;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "Public read vehicle images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'vehicle-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Staff manage vehicle images"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'vehicle-images' AND public.is_staff(auth.uid()))
    WITH CHECK (bucket_id = 'vehicle-images' AND public.is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.vehicle_maintenance REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_maintenance;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
