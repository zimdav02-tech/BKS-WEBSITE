import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpenCheck,
  Building2,
  CalendarClock,
  Car,
  CircleDollarSign,
  ClipboardList,
  Headphones,
  Home,
  MapPinned,
  Plus,
  Radio,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminPanel, AdminSkeleton, KpiCard, StatusDot } from "@/components/admin/AdminUI";
import { StatusPill, money } from "@/components/portal/status";
import { useMyRoles } from "@/hooks/useAdmin";
import {
  useAdminActivity,
  useAdminApartments,
  useAdminBookings,
  useAdminConversations,
  useAdminNotifications,
  useAdminPayments,
  useAdminRealtime,
  useAdminRequests,
  useAdminTransfers,
  useAdminVehicles,
  type AdminBooking,
} from "@/hooks/useAdminData";
import { useProfile } from "@/hooks/usePortal";
import { cn } from "@/lib/utils";

const ZONE = "Africa/Lusaka";
const ACTIVE_BOOKING = new Set(["approved", "in_progress"]);
const OPEN_REQUEST = new Set(["new", "in_review"]);
const OPEN_PAYMENT = new Set(["pending", "under_review"]);
const OPEN_TRANSFER = new Set([
  "flight_scheduled",
  "driver_assigned",
  "driver_en_route",
  "driver_waiting",
  "picked_up",
]);

const SERVICE_LABEL: Record<string, string> = {
  apartment: "Furnished apartments",
  vehicle: "Car hire",
  airport_transfer: "Airport transfers",
  tour: "Travel & tours",
  cargo: "Cargo",
  logistics: "Logistics",
  get_cash: "BKS Get Cash",
  construction: "Construction",
  property: "Real estate",
  enquiry: "Enquiries",
  support: "Support",
  real_estate: "Real estate",
  other: "Other",
};

function todayStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(date);
}

function formatStamp(iso: string | null | undefined, withTime = true) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (Math.abs(minutes) < 1) return "Just now";
  if (Math.abs(minutes) < 60) return `${Math.abs(minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h ago`;
  return `${Math.abs(Math.round(hours / 24))}d ago`;
}

function customerName(booking: AdminBooking) {
  return booking.profiles?.full_name || booking.profiles?.email || "Customer";
}

function serviceLabel(booking: AdminBooking) {
  const first = booking.booking_services?.[0];
  return first?.label || booking.title || SERVICE_LABEL[first?.kind ?? ""] || "BKS service";
}

type FleetStatus = "available" | "assigned" | "maintenance" | "unavailable";

export function OperationsCenter() {
  const live = useAdminRealtime();
  const { isSuperAdmin, roles } = useMyRoles();
  const { data: profile } = useProfile();
  const bookings = useAdminBookings();
  const requests = useAdminRequests();
  const payments = useAdminPayments();
  const transfers = useAdminTransfers();
  const conversations = useAdminConversations();
  const notifications = useAdminNotifications();
  const apartments = useAdminApartments();
  const vehicles = useAdminVehicles();
  const activity = useAdminActivity();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loading =
    bookings.isLoading ||
    requests.isLoading ||
    payments.isLoading ||
    transfers.isLoading ||
    apartments.isLoading ||
    vehicles.isLoading;

  const today = todayStamp(now);
  const bookingRows = bookings.data ?? [];
  const requestRows = requests.data ?? [];
  const paymentRows = payments.data ?? [];
  const transferRows = transfers.data ?? [];
  const apartmentRows = apartments.data ?? [];
  const vehicleRows = vehicles.data ?? [];
  const conversationRows = conversations.data ?? [];
  const notificationRows = notifications.data ?? [];
  const activityRows = activity.data ?? [];

  const assignedVehicleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const booking of bookingRows) {
      if (!ACTIVE_BOOKING.has(booking.status) && booking.status !== "pending") continue;
      for (const service of booking.booking_services ?? []) {
        if (service.vehicle_id) ids.add(service.vehicle_id);
      }
    }
    for (const transfer of transferRows) {
      if (transfer.vehicle_id && OPEN_TRANSFER.has(transfer.stage)) ids.add(transfer.vehicle_id);
    }
    return ids;
  }, [bookingRows, transferRows]);

  const occupiedApartmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const booking of bookingRows) {
      if (!ACTIVE_BOOKING.has(booking.status) && booking.status !== "pending") continue;
      const starts = booking.start_date ?? "";
      const ends = booking.end_date ?? booking.start_date ?? "";
      if (starts && ends && (today < starts || today > ends)) continue;
      for (const service of booking.booking_services ?? []) {
        if (service.apartment_id) ids.add(service.apartment_id);
      }
    }
    return ids;
  }, [bookingRows, today]);

  const fleet = useMemo(() => {
    const counts: Record<FleetStatus, number> = {
      available: 0,
      assigned: 0,
      maintenance: 0,
      unavailable: 0,
    };
    const rows = vehicleRows.map((vehicle) => {
      let status: FleetStatus = "available";
      if (!vehicle.is_active) status = "maintenance";
      else if (assignedVehicleIds.has(vehicle.id)) status = "assigned";
      else if (!vehicle.registration) status = "unavailable";
      counts[status] += 1;
      return { ...vehicle, status };
    });
    return { counts, rows };
  }, [assignedVehicleIds, vehicleRows]);

  const kpis = [
    {
      label: "Active Bookings",
      value: String(bookingRows.filter((row) => ACTIVE_BOOKING.has(row.status)).length),
      delta: `${bookingRows.length} total`,
      to: "/admin/bookings",
      icon: BookOpenCheck,
    },
    {
      label: "Pending Requests",
      value: String(requestRows.filter((row) => OPEN_REQUEST.has(row.status)).length),
      delta: "Needs triage",
      to: "/admin/requests",
      icon: ClipboardList,
    },
    {
      label: "Today's Reservations",
      value: String(
        bookingRows.filter((row) => row.start_date === today && row.status !== "cancelled").length +
          transferRows.filter((row) => row.arrival_at && todayStamp(new Date(row.arrival_at)) === today).length,
      ),
      delta: "Arrivals & stays",
      to: "/admin/calendar",
      icon: CalendarClock,
    },
    {
      label: "Active Fleet",
      value: String(vehicleRows.filter((row) => row.is_active).length),
      delta: `${vehicleRows.length} vehicles`,
      to: "/admin/vehicles",
      icon: Car,
    },
    {
      label: "Available Properties",
      value: String(apartmentRows.filter((row) => row.is_active && !occupiedApartmentIds.has(row.id)).length),
      delta: `${apartmentRows.length} listed`,
      to: "/admin/apartments",
      icon: Building2,
    },
    {
      label: "Pending Payments",
      value: String(paymentRows.filter((row) => OPEN_PAYMENT.has(row.status)).length),
      delta: money(
        paymentRows.filter((row) => OPEN_PAYMENT.has(row.status)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      ),
      to: "/admin/payments",
      icon: CircleDollarSign,
    },
    {
      label: "Open Support Requests",
      value: String(
        conversationRows.length + requestRows.filter((row) => row.type === "support" && OPEN_REQUEST.has(row.status)).length,
      ),
      delta: "Live conversations",
      to: "/admin/support",
      icon: Headphones,
    },
    {
      label: "Revenue / Transactions",
      value: money(paymentRows.filter((row) => row.status === "approved").reduce((sum, row) => sum + Number(row.amount ?? 0), 0)),
      delta: `${paymentRows.filter((row) => row.status === "approved").length} captured`,
      to: "/admin/payments",
      icon: CircleDollarSign,
    },
  ];

  const pendingActions = useMemo(() => {
    const items: { id: string; title: string; detail: string; tone: "warning" | "danger" | "neutral"; to: string; when: string }[] =
      [];
    for (const row of bookingRows.filter((booking) => booking.status === "pending")) {
      items.push({
        id: `booking-${row.id}`,
        title: row.reference,
        detail: `${customerName(row)} · ${serviceLabel(row)}`,
        tone: "warning",
        to: "/admin/bookings",
        when: row.created_at,
      });
    }
    for (const row of requestRows.filter((request) => OPEN_REQUEST.has(request.status))) {
      items.push({
        id: `request-${row.id}`,
        title: row.reference,
        detail: `${row.subject} · ${row.contact_name || row.contact_email || "Request"}`,
        tone: row.status === "new" ? "danger" : "warning",
        to: "/admin/requests",
        when: row.created_at,
      });
    }
    for (const row of paymentRows.filter((payment) => OPEN_PAYMENT.has(payment.status))) {
      items.push({
        id: `payment-${row.id}`,
        title: money(row.amount, row.currency),
        detail: `${row.method || "Payment"} · ${row.bookings?.reference ?? "Unlinked"}`,
        tone: "warning",
        to: "/admin/payments",
        when: row.created_at,
      });
    }
    for (const row of transferRows.filter((transfer) => !transfer.driver_name && OPEN_TRANSFER.has(transfer.stage))) {
      items.push({
        id: `transfer-${row.id}`,
        title: row.flight_number || "Airport transfer",
        detail: `${row.airport || "Pickup"} · driver unassigned`,
        tone: "danger",
        to: "/admin/transfers",
        when: row.arrival_at ?? row.created_at,
      });
    }
    return items.sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 8);
  }, [bookingRows, paymentRows, requestRows, transferRows]);

  const schedule = useMemo(() => {
    const items: { id: string; time: string; title: string; detail: string; tone: "success" | "warning" | "neutral"; sort: string }[] =
      [];
    for (const row of bookingRows) {
      if (!row.start_date || row.start_date !== today || row.status === "cancelled") continue;
      items.push({
        id: `stay-${row.id}`,
        time: "Stay",
        title: row.reference,
        detail: `${customerName(row)} · ${serviceLabel(row)}`,
        tone: ACTIVE_BOOKING.has(row.status) ? "success" : "warning",
        sort: `${row.start_date}T00:00:00`,
      });
    }
    for (const row of transferRows) {
      if (!row.arrival_at || todayStamp(new Date(row.arrival_at)) !== today) continue;
      items.push({
        id: `pickup-${row.id}`,
        time: formatStamp(row.arrival_at),
        title: row.flight_number || row.bookings?.reference || "Pickup",
        detail: `${row.airport || "Airport"} · ${row.driver_name || "Unassigned"}`,
        tone: row.driver_name ? "success" : "warning",
        sort: row.arrival_at,
      });
    }
    for (const booking of bookingRows) {
      for (const service of booking.booking_services ?? []) {
        if (!service.start_at || todayStamp(new Date(service.start_at)) !== today) continue;
        items.push({
          id: `svc-${service.id}`,
          time: formatStamp(service.start_at),
          title: service.label,
          detail: `${booking.reference} · ${customerName(booking)}`,
          tone: "neutral",
          sort: service.start_at,
        });
      }
    }
    return items.sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, 10);
  }, [bookingRows, today, transferRows]);

  const feed = useMemo(() => {
    const items = [
      ...activityRows.map((row) => ({
        id: `act-${row.id}`,
        title: row.title,
        detail: row.description || "Operational record updated",
        when: row.created_at,
      })),
      ...notificationRows.map((row) => ({
        id: `note-${row.id}`,
        title: row.title,
        detail: row.description || row.category,
        when: row.created_at,
      })),
    ];
    return items.sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 12);
  }, [activityRows, notificationRows]);

  const serviceOverview = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const booking of bookingRows) {
      if (booking.status === "cancelled") continue;
      const kinds = booking.booking_services ?? [];
      if (!kinds.length) bump("other");
      for (const service of kinds) bump(service.kind);
    }
    for (const request of requestRows) {
      if (request.status === "closed" || request.status === "rejected") continue;
      bump(request.type);
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()]
      .map(([key, value]) => ({ key, label: SERVICE_LABEL[key] ?? key.replaceAll("_", " "), value, max }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [bookingRows, requestRows]);

  const unread = notificationRows.filter((row) => !row.is_read).length;
  const roleLabel = isSuperAdmin ? "Super Administrator" : (roles?.[0] ?? "staff").replaceAll("_", " ");
  const initials = (profile?.full_name || profile?.email || "BKS")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  if (loading && !bookingRows.length && !vehicleRows.length) {
    return <AdminSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-gradient-ink text-ink-foreground shadow-soft">
        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Command centre</p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Operations Center</h1>
            <p className="mt-1 text-sm text-ink-foreground/70">Live control of bookings, fleet, properties and requests.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-foreground/50">Lusaka time</p>
              <p className="mt-1 font-display text-sm font-semibold tabular-nums">{clock}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold">
              <Radio className={cn("size-3", live === "live" ? "animate-pulse text-gold" : "text-ink-foreground/50")} />
              {live === "live" ? "Realtime live" : live === "connecting" ? "Connecting" : "Realtime offline"}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="glass" size="sm" className="relative border-white/10 bg-white/5 text-ink-foreground">
                  <Bell /> Notifications
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">{unread} unread</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notificationRows.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">No operational alerts.</p>
                  ) : (
                    notificationRows.slice(0, 6).map((row) => (
                      <Link
                        key={row.id}
                        to="/admin/$module"
                        params={{ module: (row.action_url?.split("/").filter(Boolean).pop() || "notifications") }}
                        className="block border-b px-4 py-3 hover:bg-accent"
                      >
                        <p className="text-sm font-semibold">{row.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{row.description || relativeTime(row.created_at)}</p>
                      </Link>
                    ))
                  )}
                </div>
                <div className="px-4 py-3">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/admin/$module" params={{ module: "notifications" }}>Open notification centre</Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <Avatar className="size-9 border border-white/10">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile?.full_name || profile?.email || "Administrator"}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-foreground/50">{roleLabel}</p>
              </div>
              <ShieldCheck className="size-4 text-gold" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
        <AdminPanel>
          <SectionTitle
            title="Pending Actions"
            hint={`${pendingActions.length} items need attention`}
            action={<Button asChild variant="ghost" size="sm"><Link to="/admin/$module" params={{ module: "bookings" }}>Review all</Link></Button>}
          />
          {pendingActions.length === 0 ? (
            <EmptyLine text="Queue is clear. New bookings and requests will appear here instantly." />
          ) : (
            <ul className="mt-4 divide-y">
              {pendingActions.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <StatusDot label={item.tone === "danger" ? "Urgent" : "Review"} tone={item.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{relativeTime(item.when)}</span>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/$module" params={{ module: item.to.replace("/admin/", "") }}>Open</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel>
            <SectionTitle title="Quick Actions" hint="Jump into the operational modules" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { title: "Create Booking", to: "/admin/bookings", icon: Plus },
                { title: "Add Property", to: "/admin/real-estate", icon: Home },
                { title: "Add Vehicle", to: "/admin/vehicles", icon: Car },
                { title: "Reservations", to: "/admin/calendar", icon: CalendarClock },
                { title: "Customers", to: "/admin/customers", icon: Users },
                { title: "Requests", to: "/admin/requests", icon: ClipboardList },
              ].map((action) => (
                <Button key={action.title} asChild variant="goldOutline" size="sm" className="h-11 justify-start">
                  <Link to="/admin/$module" params={{ module: action.to.replace("/admin/", "") }}>
                    <action.icon />
                    {action.title}
                  </Link>
                </Button>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <SectionTitle title="Fleet Status" hint={`${vehicleRows.length} vehicles in the pool`} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["Available", fleet.counts.available, "success"],
                  ["Assigned", fleet.counts.assigned, "neutral"],
                  ["Maintenance", fleet.counts.maintenance, "warning"],
                  ["Unavailable", fleet.counts.unavailable, "danger"],
                ] as const
              ).map(([label, value, tone]) => (
                <div key={label} className="rounded-md border bg-muted/40 p-3">
                  <p className="font-display text-xl font-bold tabular-nums">{value}</p>
                  <StatusDot label={label} tone={tone} />
                </div>
              ))}
            </div>
            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
              {fleet.rows.length === 0 ? (
                <EmptyLine text="No vehicles in the fleet yet." />
              ) : (
                fleet.rows.slice(0, 8).map((vehicle) => (
                  <article key={vehicle.id} className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{vehicle.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {vehicle.registration || "No plate"} · {vehicle.category || "Fleet"}
                      </p>
                    </div>
                    <StatusDot
                      label={vehicle.status}
                      tone={
                        vehicle.status === "available"
                          ? "success"
                          : vehicle.status === "assigned"
                            ? "neutral"
                            : vehicle.status === "maintenance"
                              ? "warning"
                              : "danger"
                      }
                    />
                  </article>
                ))
              )}
            </div>
          </AdminPanel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <AdminPanel>
          <SectionTitle title="Today's Schedule" hint={`${schedule.length} movements for ${today}`} />
          {schedule.length === 0 ? (
            <EmptyLine text="No reservations, pickups or appointments scheduled today." />
          ) : (
            <ol className="mt-4 space-y-3">
              {schedule.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="w-20 shrink-0">
                    <p className="text-xs font-bold tabular-nums">{item.time}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <StatusDot label={item.tone === "warning" ? "Watch" : "On plan"} tone={item.tone} />
                </li>
              ))}
            </ol>
          )}
        </AdminPanel>

        <AdminPanel>
          <SectionTitle
            title="Live Activity Feed"
            hint="Updates without refresh"
            action={<Activity className="size-4 text-primary" />}
          />
          {feed.length === 0 ? (
            <EmptyLine text="Activity will stream here as bookings and requests are created." />
          ) : (
            <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {feed.map((item, index) => (
                <li key={item.id} className="flex gap-3">
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full bg-primary", index === 0 && "animate-pulse")} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{relativeTime(item.when)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
        <AdminPanel>
          <SectionTitle
            title="Recent Bookings"
            hint="Customer, service, date and status"
            action={<Button asChild variant="ghost" size="sm"><Link to="/admin/$module" params={{ module: "bookings" }}>View bookings</Link></Button>}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-sm text-muted-foreground">
                      No bookings yet. New customer bookings will land here in real time.
                    </td>
                  </tr>
                ) : (
                  bookingRows.slice(0, 8).map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 font-semibold">{row.reference}</td>
                      <td className="py-3">{customerName(row)}</td>
                      <td className="py-3">{serviceLabel(row)}</td>
                      <td className="py-3 text-muted-foreground">{row.start_date ? formatStamp(row.start_date, false) : "—"}</td>
                      <td className="py-3">
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel>
          <SectionTitle title="Service Overview" hint="Live counts across BKS services" />
          {serviceOverview.length === 0 ? (
            <EmptyLine text="Service volume will populate from bookings and requests." />
          ) : (
            <ul className="mt-4 space-y-3">
              {serviceOverview.map((item) => (
                <li key={item.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="tabular-nums font-semibold">{item.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.value / item.max) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/40 p-3">
              <Wrench className="size-4 text-primary" />
              <p className="mt-2 font-semibold">{fleet.counts.assigned} vehicles on task</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <MapPinned className="size-4 text-primary" />
              <p className="mt-2 font-semibold">
                {transferRows.filter((row) => OPEN_TRANSFER.has(row.stage)).length} live transfers
              </p>
            </div>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="mt-6 rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">{text}</p>;
}
