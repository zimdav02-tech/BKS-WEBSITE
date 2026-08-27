-- 1. Service requests
CREATE TYPE public.request_status AS ENUM ('new','in_review','approved','rejected','closed');
CREATE TYPE public.request_type AS ENUM ('enquiry','support','cargo','get_cash','construction','real_estate','tour','other');

CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference TEXT NOT NULL DEFAULT ('BKS-REQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  type public.request_type NOT NULL DEFAULT 'enquiry',
  subject TEXT NOT NULL,
  message TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  preferred_date DATE,
  budget NUMERIC(14,2),
  status public.request_status NOT NULL DEFAULT 'new',
  staff_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own requests" ON public.service_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own requests" ON public.service_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage requests" ON public.service_requests
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete requests" ON public.service_requests
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_service_requests_updated BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_requests_status ON public.service_requests(status, created_at DESC);
CREATE INDEX idx_service_requests_user ON public.service_requests(user_id, created_at DESC);

-- 2. Notification helpers
CREATE OR REPLACE FUNCTION public.notify_staff(_title TEXT, _description TEXT, _category TEXT, _action_url TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, description, category, action_url)
  SELECT DISTINCT ur.user_id, _title, _description, _category, _action_url
  FROM public.user_roles ur
  WHERE ur.role IN ('super_admin','admin','manager','support','finance','operations');
$$;

CREATE OR REPLACE FUNCTION public.bookings_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_staff('New booking submitted',
      COALESCE(NEW.title, NEW.reference) || ' is awaiting review.', 'booking', '/admin/bookings');
    INSERT INTO public.activity_events (user_id, title, description, icon)
    VALUES (NEW.user_id, 'Booking submitted', NEW.reference || ' has been submitted for review.', 'calendar');
  ELSIF TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    INSERT INTO public.notifications (user_id, title, description, category, action_url)
    VALUES (NEW.user_id, 'Booking ' || NEW.status::text,
      NEW.reference || ' is now ' || replace(NEW.status::text,'_',' ') || '.', 'booking', '/portal/bookings');
    INSERT INTO public.activity_events (user_id, title, description, icon)
    VALUES (NEW.user_id, 'Booking updated', NEW.reference || ' status changed to ' || NEW.status::text || '.', 'check');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_bookings_notify AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_notify();

CREATE OR REPLACE FUNCTION public.service_requests_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_staff('New ' || replace(NEW.type::text,'_',' ') || ' request',
      NEW.subject, 'request', '/admin/requests');
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.activity_events (user_id, title, description, icon)
      VALUES (NEW.user_id, 'Request submitted', NEW.subject, 'clipboard');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, description, category, action_url)
    VALUES (NEW.user_id, 'Request ' || replace(NEW.status::text,'_',' '), NEW.subject, 'request', '/portal/requests');
    INSERT INTO public.activity_events (user_id, title, description, icon)
    VALUES (NEW.user_id, 'Request updated', NEW.subject || ' is now ' || replace(NEW.status::text,'_',' ') || '.', 'check');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_service_requests_notify AFTER INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_notify();

REVOKE EXECUTE ON FUNCTION public.notify_staff(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.service_requests_notify() FROM PUBLIC, anon, authenticated;

-- 3. Super admin claim (in case the account already exists)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'::app_role FROM public.profiles p
WHERE lower(p.email) = 'zimdav02@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles SET is_verified = true WHERE lower(email) = 'zimdav02@gmail.com';

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.airport_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;