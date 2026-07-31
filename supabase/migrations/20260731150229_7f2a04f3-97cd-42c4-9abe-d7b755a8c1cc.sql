-- ENUM of roles
CREATE TYPE public.app_role AS ENUM (
  'super_admin','admin','manager','driver','housekeeping','support','finance','operations','customer'
);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id);

-- HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','manager','support','finance','operations')
  );
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NEW USER HANDLER: create profile + auto-assign super_admin to the fixed email
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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill if the account already exists
INSERT INTO public.profiles (id, email, full_name, is_verified)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name',''), true
FROM auth.users u WHERE lower(u.email) = 'zimdav02@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u WHERE lower(u.email) = 'zimdav02@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- PROTECTION: super admin role row cannot be removed/changed
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target UUID; target_email TEXT;
BEGIN
  target := COALESCE(OLD.user_id, NEW.user_id);
  SELECT lower(email) INTO target_email FROM public.profiles WHERE id = target;
  IF TG_OP IN ('UPDATE','DELETE') AND COALESCE(OLD.role, NEW.role) = 'super_admin'
     AND target_email = 'zimdav02@gmail.com' THEN
    RAISE EXCEPTION 'The Super Administrator role is permanent and cannot be modified.';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.role = 'super_admin'
     AND NOT public.is_super_admin(auth.uid())
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Only the Super Administrator can grant the super_admin role.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER protect_super_admin_role_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();

-- PROTECTION: super admin profile cannot be suspended or deleted
CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND lower(OLD.email) = 'zimdav02@gmail.com' THEN
    RAISE EXCEPTION 'The Super Administrator account cannot be deleted.';
  END IF;
  IF TG_OP = 'UPDATE' AND lower(OLD.email) = 'zimdav02@gmail.com' THEN
    IF auth.uid() IS DISTINCT FROM OLD.id AND (NEW.status <> OLD.status OR NEW.email <> OLD.email) THEN
      RAISE EXCEPTION 'The Super Administrator account cannot be disabled or changed by another user.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER protect_super_admin_profile_trg
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_profile();

-- AUDIT LOG immutability
CREATE OR REPLACE FUNCTION public.audit_logs_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Audit logs are immutable.'; END; $$;

-- POLICIES: profiles
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins manage profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Super admin deletes profiles" ON public.profiles
FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- POLICIES: user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "Super admin manages roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- POLICIES: audit_logs
CREATE POLICY "Staff read audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Authenticated write audit logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
