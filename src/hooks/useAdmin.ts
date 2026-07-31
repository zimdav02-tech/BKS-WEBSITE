import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "support",
  "finance",
  "operations",
];

export function useMyRoles() {
  const [roles, setRoles] = useState<AppRole[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) setRoles([]);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      if (active) setRoles((data ?? []).map((r) => r.role as AppRole));
    })();
    return () => {
      active = false;
    };
  }, []);

  return {
    roles,
    loading: roles === null,
    isSuperAdmin: !!roles?.includes("super_admin"),
    isStaff: !!roles?.some((r) => STAFF_ROLES.includes(r)),
  };
}