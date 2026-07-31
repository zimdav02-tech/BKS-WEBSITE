import { supabase } from "@/integrations/supabase/client";

/**
 * Records an administrative action in the immutable audit log.
 * Always called with the acting user's id; the timestamp is set by the database.
 */
export async function logAudit(params: {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    actor_email: data.user.email ?? null,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    details: (params.details ?? {}) as never,
  });
}