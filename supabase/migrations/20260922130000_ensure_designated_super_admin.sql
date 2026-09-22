-- Allow the designated Super Admin (zimdav02@gmail.com) to receive super_admin
-- even when the acting session is that user and they are not yet a super_admin.
-- The previous INSERT guard blocked the first grant (and any later claim) because
-- is_super_admin(auth.uid()) is false until the row exists — a chicken-and-egg.

CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target UUID;
  target_email TEXT;
BEGIN
  target := COALESCE(OLD.user_id, NEW.user_id);
  SELECT lower(email) INTO target_email FROM public.profiles WHERE id = target;
  IF target_email IS NULL THEN
    SELECT lower(email) INTO target_email FROM auth.users WHERE id = target;
  END IF;

  IF TG_OP IN ('UPDATE','DELETE') AND COALESCE(OLD.role, NEW.role) = 'super_admin'
     AND target_email = 'zimdav02@gmail.com' THEN
    RAISE EXCEPTION 'The Super Administrator role is permanent and cannot be modified.';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'super_admin' THEN
    -- Designated account may claim the role (bootstrap / repair while signed in).
    IF target_email = 'zimdav02@gmail.com' THEN
      RETURN NEW;
    END IF;
    IF NOT public.is_super_admin(auth.uid()) AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Only the Super Administrator can grant the super_admin role.';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Grants super_admin only when auth.users.email is the designated address.
-- Not callable by clients (no GRANT to authenticated); used by the claim RPC
-- and the new-user trigger.
CREATE OR REPLACE FUNCTION public.grant_designated_super_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mail text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(email) INTO mail FROM auth.users WHERE id = _user_id;
  IF mail IS DISTINCT FROM 'zimdav02@gmail.com' THEN
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, is_verified, status)
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    true,
    'active'
  FROM auth.users u
  WHERE u.id = _user_id
  ON CONFLICT (id) DO UPDATE SET is_verified = true;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Client-callable claim: only the signed-in designated user is repaired.
CREATE OR REPLACE FUNCTION public.ensure_designated_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  mail text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email) INTO mail FROM auth.users WHERE id = uid;
  IF mail IS DISTINCT FROM 'zimdav02@gmail.com' THEN
    RETURN false;
  END IF;

  PERFORM public.grant_designated_super_admin(uid);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    lower(NEW.email) = 'zimdav02@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  IF lower(NEW.email) = 'zimdav02@gmail.com' THEN
    PERFORM public.grant_designated_super_admin(NEW.id);
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_designated_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_designated_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_designated_super_admin() TO authenticated;

-- Repair the existing auth user if the profile/role was never created.
INSERT INTO public.profiles (id, email, full_name, is_verified, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  true,
  'active'
FROM auth.users u
WHERE lower(u.email) = 'zimdav02@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_verified = true;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'zimdav02@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET is_verified = true
WHERE lower(email) = 'zimdav02@gmail.com';
