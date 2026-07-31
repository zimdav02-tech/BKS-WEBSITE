import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Users, ScrollText, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useMyRoles, type AppRole } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console | BKS Investment Group" },
      {
        name: "description",
        content:
          "BKS administration console for user management, role assignment and audit log review.",
      },
      { property: "og:title", content: "BKS Admin Console" },
      { property: "og:description", content: "Manage users, roles and audit logs across BKS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConsole,
});

const ALL_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "driver",
  "housekeeping",
  "support",
  "finance",
  "operations",
  "customer",
];

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
};

type RoleRow = { user_id: string; role: AppRole };

type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

const SUPER_ADMIN_EMAIL = "zimdav02@gmail.com";

function AdminConsole() {
  const navigate = useNavigate();
  const { loading, isStaff, isSuperAdmin } = useMyRoles();

  useEffect(() => {
    if (!loading && !isStaff) {
      toast.error("Administrator access required");
      navigate({ to: "/portal" });
    }
  }, [loading, isStaff, navigate]);

  if (loading || !isStaff) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="glass-panel sticky top-0 z-40">
        <div className="container-bks flex h-18 items-center justify-between py-3">
          <Link to="/portal" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-primary-foreground">
              BKS
            </span>
            <span className="font-display text-sm font-bold">Admin Console</span>
          </Link>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <span className="hidden items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground sm:inline-flex">
                <ShieldCheck className="size-3.5" /> Super Administrator
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logAudit({ action: "auth.sign_out" });
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container-bks py-10">
        <h1 className="font-display text-3xl font-bold">Platform administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage people, roles and the immutable audit trail. The Super Administrator account is
          permanent and protected at database level.
        </p>

        <Tabs defaultValue="users" className="mt-8">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="mr-1.5 size-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="audit">
              <ScrollText className="mr-1.5 size-4" /> Audit logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersPanel isSuperAdmin={isSuperAdmin} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UsersPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,phone,status,is_verified,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setRoles((r.data ?? []) as RoleRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = profiles.filter((p) =>
    `${p.email} ${p.full_name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  async function toggleStatus(p: ProfileRow) {
    const next = p.status === "active" ? "suspended" : "active";
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", p.id);
    setBusy(false);
    if (error) {
      toast.error("Could not update account", { description: error.message });
      return;
    }
    await logAudit({
      action: next === "active" ? "user.activated" : "user.suspended",
      entityType: "profile",
      entityId: p.id,
      details: { email: p.email },
    });
    toast.success(`Account ${next}`);
    void load();
  }

  async function toggleVerified(p: ProfileRow) {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !p.is_verified })
      .eq("id", p.id);
    setBusy(false);
    if (error) {
      toast.error("Could not update verification", { description: error.message });
      return;
    }
    await logAudit({
      action: p.is_verified ? "user.unverified" : "user.verified",
      entityType: "profile",
      entityId: p.id,
      details: { email: p.email },
    });
    void load();
  }

  async function setRole(p: ProfileRow, role: AppRole) {
    setBusy(true);
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", p.id);
    if (delErr) {
      setBusy(false);
      toast.error("Could not change role", { description: delErr.message });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role });
    setBusy(false);
    if (error) {
      toast.error("Could not change role", { description: error.message });
      return;
    }
    await logAudit({
      action: "user.role_changed",
      entityType: "profile",
      entityId: p.id,
      details: { email: p.email, role },
    });
    toast.success(`Role set to ${role.replace("_", " ")}`);
    void load();
  }

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <Input
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-3xl text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Verified</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const locked = p.email.toLowerCase() === SUPER_ADMIN_EMAIL;
              const userRoles = roles.filter((r) => r.user_id === p.id).map((r) => r.role);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{p.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {locked || !isSuperAdmin ? (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        {(userRoles[0] ?? "customer").replace("_", " ")}
                      </span>
                    ) : (
                      <select
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        value={userRoles[0] ?? "customer"}
                        disabled={busy}
                        onChange={(e) => void setRole(p, e.target.value as AppRole)}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        p.status === "active"
                          ? "text-xs font-semibold text-emerald-600"
                          : "text-xs font-semibold text-destructive"
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs">{p.is_verified ? "Yes" : "No"}</td>
                  <td className="py-3">
                    {locked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="size-3.5" /> Protected
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggleStatus(p)}>
                          {p.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggleVerified(p)}>
                          {p.is_verified ? "Unverify" : "Verify"}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditPanel() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id,actor_email,action,entity_type,entity_id,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs((data ?? []) as AuditRow[]);
    })();
  }, []);

  const filtered = logs.filter((l) =>
    `${l.action} ${l.actor_email ?? ""} ${l.entity_type ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <Input
        placeholder="Filter logs by action or user…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      <ul className="mt-6 divide-y divide-border">
        {filtered.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <span className="font-medium">{l.action}</span>
              <span className="text-muted-foreground">
                {l.entity_type ? ` · ${l.entity_type}` : ""}
              </span>
              <div className="text-xs text-muted-foreground">{l.actor_email ?? "system"}</div>
            </div>
            <time className="text-xs text-muted-foreground">
              {new Date(l.created_at).toLocaleString()}
            </time>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">No audit entries yet.</li>
        )}
      </ul>
    </div>
  );
}