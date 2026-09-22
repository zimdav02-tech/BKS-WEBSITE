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

export type StaffAccess = {
  roles: AppRole[];
  isStaff: boolean;
  isSuperAdmin: boolean;
};

export function destinationForAccess(access: StaffAccess): "/admin" | "/portal" {
  return access.isStaff ? "/admin" : "/portal";
}

/**
 * Claims the designated Super Admin role if the signed-in auth email matches,
 * then reads user_roles. Safe for normal customers: the RPC is a no-op for
 * every other account.
 */
export async function loadMyStaffAccess(): Promise<StaffAccess> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { roles: [], isStaff: false, isSuperAdmin: false };
  }

  const { error: claimError } = await supabase.rpc("ensure_designated_super_admin");
  if (claimError) {
    console.warn("ensure_designated_super_admin:", claimError.message);
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  if (error) {
    console.error("user_roles:", error.message);
  }

  const roles = (data ?? []).map((row) => row.role as AppRole);
  return {
    roles,
    isStaff: roles.some((role) => STAFF_ROLES.includes(role)),
    isSuperAdmin: roles.includes("super_admin"),
  };
}

export function useMyRoles() {
  const [access, setAccess] = useState<StaffAccess | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await loadMyStaffAccess();
      if (active) setAccess(next);
    })();
    return () => {
      active = false;
    };
  }, []);

  return {
    roles: access?.roles ?? null,
    loading: access === null,
    isSuperAdmin: !!access?.isSuperAdmin,
    isStaff: !!access?.isStaff,
  };
}

