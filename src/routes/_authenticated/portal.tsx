import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, CreditCard, FileText, LifeBuoy, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMyRoles } from "@/hooks/useAdmin";

export const Route = createFileRoute("/_authenticated/portal")({
  component: Portal,
});

const tiles = [
  { icon: CalendarCheck, title: "My Bookings", body: "Track every booking stage in real time." },
  { icon: CreditCard, title: "My Payments", body: "Upload proof of payment and see verification status." },
  { icon: FileText, title: "My Invoices", body: "Invoices and receipts generated automatically." },
  { icon: LifeBuoy, title: "Support Chat", body: "Message the BKS operations desk directly." },
];

function Portal() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { isStaff } = useMyRoles();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="glass-panel sticky top-0 z-40">
        <div className="container-bks flex h-18 items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-primary-foreground">
              BKS
            </span>
            <span className="font-display text-sm font-bold">Customer Portal</span>
          </Link>
          <div className="flex items-center gap-2">
          {isStaff && (
            <Button asChild variant="goldOutline" size="sm">
              <Link to="/admin">
                <ShieldCheck /> Admin console
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut /> Sign out
          </Button>
          </div>
        </div>
      </header>

      <main className="container-bks py-12">
        <h1 className="font-display text-3xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your dashboard is being wired up next — bookings, payments, invoices, notifications and
          support chat will appear here.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.title} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <t.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{t.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-ink p-8 text-ink-foreground">
          <h2 className="font-display text-xl font-bold">Need something now?</h2>
          <p className="mt-2 text-sm text-ink-foreground/70">
            Browse services and send us a request while your dashboard modules are being finalised.
          </p>
          <Button asChild variant="gold" className="mt-5">
            <Link to="/services">Explore services</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}