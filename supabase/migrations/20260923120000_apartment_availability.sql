-- Apartment type, maintenance/unavailable holds, public day status, and image storage.
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS hold_reason text;

ALTER TABLE public.apartments
  DROP CONSTRAINT IF EXISTS apartments_hold_reason_check;

ALTER TABLE public.apartments
  ADD CONSTRAINT apartments_hold_reason_check
  CHECK (hold_reason IS NULL OR hold_reason IN ('maintenance', 'unavailable'));

-- A booking change bumps the apartment row so public catalogue listeners refresh.
CREATE OR REPLACE FUNCTION public.touch_booked_apartment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  apt uuid;
BEGIN
  IF TG_TABLE_NAME = 'booking_services' THEN
    IF TG_OP = 'DELETE' THEN
      apt := OLD.apartment_id;
    ELSE
      apt := NEW.apartment_id;
      IF TG_OP = 'UPDATE' AND OLD.apartment_id IS DISTINCT FROM NEW.apartment_id AND OLD.apartment_id IS NOT NULL THEN
        UPDATE public.apartments SET updated_at = now() WHERE id = OLD.apartment_id;
      END IF;
    END IF;
    IF apt IS NOT NULL THEN
      UPDATE public.apartments SET updated_at = now() WHERE id = apt;
    END IF;
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    UPDATE public.apartments AS apartment
    SET updated_at = now()
    FROM public.booking_services AS service
    WHERE service.booking_id = NEW.id
      AND service.apartment_id = apartment.id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.touch_booked_apartment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS booking_services_touch_apartment ON public.booking_services;
CREATE TRIGGER booking_services_touch_apartment
AFTER INSERT OR UPDATE OR DELETE ON public.booking_services
FOR EACH ROW EXECUTE FUNCTION public.touch_booked_apartment();

DROP TRIGGER IF EXISTS bookings_touch_apartment ON public.bookings;
CREATE TRIGGER bookings_touch_apartment
AFTER UPDATE OF status, start_date, end_date ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.touch_booked_apartment();

-- Public availability without customer details. Reserved and occupied follow the booking dates.
CREATE OR REPLACE FUNCTION public.apartment_day_status(on_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (apartment_id uuid, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    apartment.id,
    CASE
      WHEN NOT apartment.is_active AND apartment.hold_reason = 'unavailable' THEN 'unavailable'
      WHEN NOT apartment.is_active THEN 'maintenance'
      WHEN EXISTS (
        SELECT 1
        FROM public.booking_services AS service
        JOIN public.bookings AS booking ON booking.id = service.booking_id
        WHERE service.apartment_id = apartment.id
          AND booking.status IN ('approved', 'in_progress')
          AND COALESCE(booking.start_date, service.start_at::date) IS NOT NULL
          AND COALESCE(booking.start_date, service.start_at::date) <= on_date
          AND COALESCE(booking.end_date, service.end_at::date, booking.start_date, service.start_at::date) >= on_date
          AND COALESCE(booking.start_date, service.start_at::date) <= (timezone('Africa/Lusaka', now()))::date
      ) THEN 'occupied'
      WHEN EXISTS (
        SELECT 1
        FROM public.booking_services AS service
        JOIN public.bookings AS booking ON booking.id = service.booking_id
        WHERE service.apartment_id = apartment.id
          AND booking.status IN ('pending', 'approved', 'in_progress')
          AND COALESCE(booking.start_date, service.start_at::date) IS NOT NULL
          AND (
            (
              COALESCE(booking.start_date, service.start_at::date) <= on_date
              AND COALESCE(booking.end_date, service.end_at::date, booking.start_date, service.start_at::date) >= on_date
            )
            OR COALESCE(booking.start_date, service.start_at::date) > on_date
          )
      ) THEN 'reserved'
      ELSE 'available'
    END
  FROM public.apartments AS apartment;
$$;

REVOKE ALL ON FUNCTION public.apartment_day_status(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apartment_day_status(date) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('apartment-images', 'apartment-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Apartment images are public'
  ) THEN
    CREATE POLICY "Apartment images are public" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'apartment-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff manage apartment images'
  ) THEN
    CREATE POLICY "Staff manage apartment images" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'apartment-images' AND public.is_staff(auth.uid()))
      WITH CHECK (bucket_id = 'apartment-images' AND public.is_staff(auth.uid()));
  END IF;
END $$;
