import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarClock,
  CreditCard,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardSkeletonGrid,
  EmptyState,
  PageHeading,
  PanelCard,
  StatCard,
  StageTimeline,
} from "@/components/portal/ui";
import { bookingStageKeys, bookingStages, money, StatusPill } from "@/components/portal/status";
import { quickActions } from "@/components/portal/quick-actions";
import {
  useActivity,
  useBookings,
  useNotifications,
  usePayments,
  useProfile,
  useTransfers,
} from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => ({
    meta: [
      { title: "Customer Portal Dashboard | BKS Investment Group" },
      {
        name: "description",
        content:
          "Manage BKS bookings, apartments, vehicles, airport transfers, payments and support from one premium dashboard.",
      },
      { property: "og:title", content: "BKS Customer Portal Dashboard" },
      {
        property: "og:description",
        content: "Your travel, accommodation and transport hub with BKS Investment Group.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardHome,
});

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

function DashboardHome() {
  const { data: profile } = useProfile();
  const bookings = useBookings();
  const payments = usePayments();
  const transfers = useTransfers();
  const notifications = useNotifications();
  const activity = useActivity(8);

  const list = bookings.data ?? [];
  const active = list.filter((b) => b.status === "approved" || b.status === "in_progress");
  const upcoming = list
    .filter((b) => b.start_date && new Date(b.start_date) >= new Date())
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
  const trip = upcoming[0] ?? active[0] ?? null;
  const pendingPayments = (payments.data ?? []).filter(
    (p) => p.status === "pending" || p.status === "under_review",
  );
  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;
  const stageIndex = trip ? bookingStageKeys.indexOf(trip.stage as never) : 0;

  const firstName = (profile?.full_name || profile?.email || "").split(/[\s@]/)[0] ?? "";

  return (
    <div className="space-y-10">
      <PageHeading
        title={`${greet()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's everything happening across your BKS services today."
        action={
          <Button asChild variant="gold">
            <Link to="/services">
              <Sparkles /> Book a service
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Ticket}
          label="Active bookings"
          value={active.length}
          hint="Approved or in progress"
          to="/portal/bookings"
          actionLabel="View bookings"
          loading={bookings.isLoading}
        />
        <StatCard
          icon={CalendarClock}
          label="Upcoming trips"
          value={upcoming.length}
          hint="Scheduled from today"
          to="/portal/itinerary"
          actionLabel="Open itinerary"
          loading={bookings.isLoading}
        />
        <StatCard
          icon={CreditCard}
          label="Pending payments"
          value={pendingPayments.length}
          hint="Awaiting verification"
          to="/portal/payments"
          actionLabel="Manage payments"
          loading={payments.isLoading}
        />
        <StatCard
          icon={Bell}
          label="Unread alerts"
          value={unread}
          hint="Notifications for you"
          to="/portal/notifications"
          actionLabel="View notifications"
          loading={notifications.isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <PanelCard className="xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">Next trip</h2>
            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <Link to="/portal/itinerary">
                Full itinerary <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {bookings.isLoading ? (
            <div className="mt-6">
              <CardSkeletonGrid count={1} />
            </div>
          ) : !trip ? (
            <div className="mt-4">
              <EmptyState
                icon={CalendarClock}
                title="No upcoming trips yet"
                description="Once you book an apartment, vehicle or transfer, your journey timeline appears here."
                actionLabel="Explore services"
                to="/services"
              />
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              <div className="rounded-3xl bg-gradient-ink p-6 text-ink-foreground">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-ink-foreground/60">
                      {trip.reference}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold">{trip.title}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink-foreground/70">
                      <MapPin className="size-4" aria-hidden />
                      {trip.start_date ?? "Date TBC"}
                      {trip.end_date ? ` → ${trip.end_date}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill status={trip.status} className="bg-gold text-ink" />
                    <p className="mt-3 font-display text-lg font-bold">
                      {money(trip.total_amount, trip.currency ?? "ZMW")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="gold" size="sm">
                    <Link to="/portal/bookings">View booking</Link>
                  </Button>
                  <Button asChild variant="glass" size="sm">
                    <Link to="/portal/support">Contact support</Link>
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-4 text-sm font-semibold">Journey progress</p>
                <StageTimeline
                  stages={[...bookingStages]}
                  currentIndex={stageIndex < 0 ? 0 : stageIndex}
                />
              </div>
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <h2 className="font-display text-lg font-semibold">Quick actions</h2>
          <div className="mt-5 space-y-3">
            {quickActions.map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="flex items-center gap-3 rounded-2xl border border-border p-3.5 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-gold"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <a.icon className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{a.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard>
          <h2 className="font-display text-lg font-semibold">Upcoming transfers</h2>
          {(transfers.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No airport transfers scheduled.{" "}
              <Link to="/portal/transfers" className="font-semibold underline">
                Book a pickup
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(transfers.data ?? []).slice(0, 3).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {t.flight_number ?? "Flight TBC"} · {t.airport ?? "Airport"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.arrival_at ? new Date(t.arrival_at).toLocaleString() : "Time TBC"}
                    </p>
                  </div>
                  <StatusPill status={String(t.stage)} />
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Activity className="size-4" aria-hidden /> Recent activity
          </h2>
          {(activity.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Your account activity will show up here.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {(activity.data ?? []).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gradient-gold" />
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground">{e.description}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PanelCard>
      </div>
    </div>
  );
}