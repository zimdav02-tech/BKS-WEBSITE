-- 20260922150000_bookings_audit_realtime.sql
-- Automatic audit trail for booking-related records + realtime for audit feed.

CREATE OR REPLACE FUNCTION public.log_row_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old text;
  v_new text;
  v_details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := TG_TABLE_NAME || '.created';
    v_details := jsonb_build_object('status', to_jsonb(NEW) -> 'status', 'stage', to_jsonb(NEW) -> 'stage');
  ELSE
    v_old := coalesce((to_jsonb(OLD) ->> 'status'), '') || '|' || coalesce((to_jsonb(OLD) ->> 'stage'), '');
    v_new := coalesce((to_jsonb(NEW) ->> 'status'), '') || '|' || coalesce((to_jsonb(NEW) ->> 'stage'), '');
    IF v_old IS NOT DISTINCT FROM v_new THEN
      RETURN NEW;
    END IF;
    v_action := TG_TABLE_NAME || '.status_changed';
    v_details := jsonb_build_object(
      'from_status', to_jsonb(OLD) -> 'status',
      'to_status', to_jsonb(NEW) -> 'status',
      'from_stage', to_jsonb(OLD) -> 'stage',
      'to_stage', to_jsonb(NEW) -> 'stage'
    );
  END IF;

  IF (to_jsonb(NEW) ? 'reference') THEN
    v_details := v_details || jsonb_build_object('reference', to_jsonb(NEW) -> 'reference');
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    v_action,
    TG_TABLE_NAME,
    (to_jsonb(NEW) ->> 'id'),
    v_details
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_row_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_audit ON public.bookings;
CREATE TRIGGER bookings_audit
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_row_audit();

DROP TRIGGER IF EXISTS payments_audit ON public.payments;
CREATE TRIGGER payments_audit
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_row_audit();

DROP TRIGGER IF EXISTS service_requests_audit ON public.service_requests;
CREATE TRIGGER service_requests_audit
AFTER INSERT OR UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.log_row_audit();

DROP TRIGGER IF EXISTS airport_transfers_audit ON public.airport_transfers;
CREATE TRIGGER airport_transfers_audit
AFTER INSERT OR UPDATE ON public.airport_transfers
FOR EACH ROW EXECUTE FUNCTION public.log_row_audit();

-- Live updates for the audit feed and requests list.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
