import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Bell, BookOpenCheck, Building2, Car, CircleDollarSign, CreditCard, Layers, ShieldCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AdminPageHeading, AdminPanel, AdminSkeleton, KpiCard, StatusDot } from "@/components/admin/AdminUI";
import { StatusPill, money } from "@/components/portal/status";
import { useMyRoles } from "@/hooks/useAdmin";
import {
  useAdminActivity,
  useAdminApartments,
  useAdminBookings,
  useAdminCustomers,
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
const OPEN_PAYMENT = new Set(["pending", "under_review"]);
const STAFF = new Set(["super_admin", "admin", "manager", "support", "finance", "operations", "driver", "housekeeping"]);

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

const PRESETS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "month", label: "This month" },
  { id: "ytd", label: "Year to date" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom range" },
] as const;

type Preset = (typeof PRESETS)[number]["id"];
type Bounds = { start: Date | null; end: Date };

const revenueConfig = { revenue: { label: "Revenue", color: "oklch(0.874 0.166 91.5)" } } satisfies ChartConfig;
const bookingConfig = { bookings: { label: "Bookings", color: "oklch(0.06 0 0)" } } satisfies ChartConfig;
const customerConfig = { customers: { label: "Customers", color: "oklch(0.874 0.166 91.5)" } } satisfies ChartConfig;
const serviceConfig = { volume: { label: "Services", color: "oklch(0.874 0.166 91.5)" } } satisfies ChartConfig;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function boundsFor(preset: Preset, customStart: string, customEnd: string, now: Date): Bounds {
  const end = endOfDay(now);
  if (preset === "custom" && customStart && customEnd) {
    const start = startOfDay(new Date(`${customStart}T00:00:00`));
    const custom = endOfDay(new Date(`${customEnd}T00:00:00`));
    if (start <= custom) return { start, end: custom };
    return { start: startOfDay(custom), end: endOfDay(start) };
  }
  if (preset === "all") return { start: null, end };
  if (preset === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  if (preset === "ytd") return { start: new Date(now.getFullYear(), 0, 1), end };
  const days = preset === "90d" ? 90 : 30;
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

function inRange(iso: string | null | undefined, bounds: Bounds) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  if (bounds.start && time < bounds.start.getTime()) return false;
  return time <= bounds.end.getTime();
}

function previousBounds(bounds: Bounds): Bounds | null {
  if (!bounds.start) return null;
  const span = bounds.end.getTime() - bounds.start.getTime();
  const end = new Date(bounds.start.getTime() - 1);
  return { start: new Date(end.getTime() - span), end };
}

function delta(current: number, previous: number | null) {
  if (previous === null) return "Selected period";
  if (previous === 0) return current === 0 ? "No change" : "New in period";
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);
  return `${rounded > 0 ? "+" : ""}${rounded}% vs prior`;
}

function percent(part: number, whole: number) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(date);
}

function serviceName(kind: string) {
  return SERVICE_LABEL[kind] ?? kind.replaceAll("_", " ");
}

function customerName(booking: AdminBooking) {
  return booking.profiles?.full_name || booking.profiles?.email || "Customer";
}

function shares(booking: AdminBooking) {
  const services = booking.booking_services ?? [];
  if (!services.length) return [{ kind: "other", share: 1 }];
  const total = services.reduce((sum, service) => sum + Number(service.amount || 0), 0);
  if (total <= 0) {
    const share = 1 / services.length;
    return services.map((service) => ({ kind: service.kind, share }));
  }
  return services.map((service) => ({ kind: service.kind, share: Number(service.amount || 0) / total }));
}

function buckets(bounds: Bounds, points: { at: string; revenue?: number; bookings?: number; customers?: number }[]) {
  const end = bounds.end;
  const start = bounds.start ?? points.reduce<Date | null>((min, point) => {
    const date = new Date(point.at);
    if (Number.isNaN(date.getTime())) return min;
    return !min || date < min ? date : min;
  }, null) ?? new Date(end.getFullYear(), end.getMonth(), 1);

  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const mode: "day" | "week" | "month" = spanDays > 120 ? "month" : spanDays > 45 ? "week" : "day";
  const series = new Map<string, { label: string; revenue: number; bookings: number; customers: number; sort: string }>();

  const cursor = startOfDay(start);
  while (cursor <= end) {
    const key = mode === "month"
      ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
      : mode === "week"
        ? dayKey(startOfWeek(cursor))
        : dayKey(cursor);
    if (!series.has(key)) {
      series.set(key, {
        label: mode === "month"
          ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(cursor)
          : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(cursor),
        revenue: 0,
        bookings: 0,
        customers: 0,
        sort: key,
      });
    }
    if (mode === "month") cursor.setMonth(cursor.getMonth() + 1, 1);
    else if (mode === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setDate(cursor.getDate() + 1);
  }

  for (const point of points) {
    const date = new Date(point.at);
    if (Number.isNaN(date.getTime())) continue;
    const key = mode === "month"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : mode === "week"
        ? dayKey(startOfWeek(date))
        : dayKey(date);
    const row = series.get(key);
    if (!row) continue;
    row.revenue += point.revenue ?? 0;
    row.bookings += point.bookings ?? 0;
    row.customers += point.customers ?? 0;
  }

  let running = 0;
  return [...series.values()]
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map((row) => {
      running += row.customers;
      return { ...row, customers: running };
    });
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  next.setDate(next.getDate() - ((day + 6) % 7));
  return next;
}

export function ExecutiveDashboard() {
  useAdminRealtime();
  const { isSuperAdmin, roles } = useMyRoles();
  const { data: profile } = useProfile();
  const bookings = useAdminBookings();
  const payments = useAdminPayments();
  const customers = useAdminCustomers();
  const requests = useAdminRequests();
  const apartments = useAdminApartments();
  const vehicles = useAdminVehicles();
  const transfers = useAdminTransfers();
  const notifications = useAdminNotifications();
  const activity = useAdminActivity();
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const bounds = useMemo(
    () => boundsFor(preset, customStart, customEnd, new Date()),
    [preset, customStart, customEnd],
  );
  const prior = useMemo(() => previousBounds(bounds), [bounds]);

  const loading = bookings.isLoading || payments.isLoading || customers.isLoading || apartments.isLoading || vehicles.isLoading;

  const model = useMemo(() => {
    const bookingRows = bookings.data ?? [];
    const paymentRows = payments.data ?? [];
    const people = (customers.data ?? []).filter((person) => !person.roles.some((role) => STAFF.has(role)));
    const requestRows = requests.data ?? [];
    const apartmentRows = apartments.data ?? [];
    const vehicleRows = vehicles.data ?? [];
    const transferRows = transfers.data ?? [];
    const bookingById = new Map(bookingRows.map((row) => [row.id, row]));

    const within = <T extends { created_at: string }>(rows: T[], window: Bounds | null) =>
      window ? rows.filter((row) => inRange(row.created_at, window)) : [];

    const bookingsNow = within(bookingRows, bounds).filter((row) => row.status !== "cancelled");
    const bookingsPrev = prior ? within(bookingRows, prior).filter((row) => row.status !== "cancelled") : [];
    const paymentsNow = within(paymentRows, bounds);
    const paymentsPrev = prior ? within(paymentRows, prior) : [];
    const approvedNow = paymentsNow.filter((row) => row.status === "approved");
    const approvedPrev = paymentsPrev.filter((row) => row.status === "approved");
    const outstandingNow = paymentsNow.filter((row) => OPEN_PAYMENT.has(row.status));
    const peopleNow = people.filter((person) => !bounds.start || new Date(person.created_at) <= bounds.end);
    const newCustomers = people.filter((person) => inRange(person.created_at, bounds));
    const newCustomersPrev = prior ? people.filter((person) => inRange(person.created_at, prior)).length : null;
    const activeCustomers = peopleNow.filter((person) => person.status === "active");
    const bookingCounts = new Map<string, number>();
    for (const row of bookingRows) bookingCounts.set(row.user_id, (bookingCounts.get(row.user_id) ?? 0) + 1);
    const returning = new Set(
      bookingsNow.filter((row) => (bookingCounts.get(row.user_id) ?? 0) > 1).map((row) => row.user_id),
    );

    const monthStart = new Date(bounds.end.getFullYear(), bounds.end.getMonth(), 1);
    const monthRevenue = paymentRows
      .filter((row) => row.status === "approved" && inRange(row.created_at, { start: monthStart, end: bounds.end }))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const revenue = approvedNow.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const revenuePrev = prior ? approvedPrev.reduce((sum, row) => sum + Number(row.amount || 0), 0) : null;
    const outstanding = outstandingNow.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const occupied = new Set<string>();
    const assigned = new Set<string>();
    for (const booking of bookingsNow) {
      for (const service of booking.booking_services ?? []) {
        if (service.apartment_id) occupied.add(service.apartment_id);
        if (service.vehicle_id) assigned.add(service.vehicle_id);
      }
    }
    for (const transfer of transferRows.filter((row) => inRange(row.created_at, bounds) || inRange(row.arrival_at, bounds))) {
      if (transfer.vehicle_id) assigned.add(transfer.vehicle_id);
    }
    const activeProperties = apartmentRows.filter((row) => row.is_active);
    const activeFleet = vehicleRows.filter((row) => row.is_active);

    const revenueByKind = new Map<string, number>();
    const bookingsByKind = new Map<string, number>();
    for (const payment of approvedNow) {
      const booking = payment.booking_id ? bookingById.get(payment.booking_id) : undefined;
      for (const part of booking ? shares(booking) : [{ kind: "other", share: 1 }]) {
        revenueByKind.set(part.kind, (revenueByKind.get(part.kind) ?? 0) + Number(payment.amount || 0) * part.share);
      }
    }
    for (const booking of bookingsNow) {
      const kinds = booking.booking_services ?? [];
      if (!kinds.length) bookingsByKind.set("other", (bookingsByKind.get("other") ?? 0) + 1);
      for (const service of kinds) bookingsByKind.set(service.kind, (bookingsByKind.get(service.kind) ?? 0) + 1);
    }
    for (const request of requestRows.filter((row) => inRange(row.created_at, bounds) && row.status !== "rejected" && row.status !== "closed")) {
      bookingsByKind.set(request.type, (bookingsByKind.get(request.type) ?? 0) + 1);
    }

    const propertyRows = apartmentRows
      .map((apartment) => {
        const stays = bookingsNow.filter((booking) =>
          (booking.booking_services ?? []).some((service) => service.apartment_id === apartment.id),
        );
        const value = stays.reduce(
          (sum, booking) =>
            sum +
            (booking.booking_services ?? [])
              .filter((service) => service.apartment_id === apartment.id)
              .reduce((inner, service) => inner + Number(service.amount || 0), 0),
          0,
        );
        return { id: apartment.id, name: apartment.name, stays: stays.length, value, active: apartment.is_active };
      })
      .sort((a, b) => b.value - a.value || b.stays - a.stays);

    const fleetRows = vehicleRows
      .map((vehicle) => {
        const jobs = bookingsNow.filter((booking) =>
          (booking.booking_services ?? []).some((service) => service.vehicle_id === vehicle.id),
        ).length + transferRows.filter((row) => row.vehicle_id === vehicle.id && (inRange(row.created_at, bounds) || inRange(row.arrival_at, bounds))).length;
        return { id: vehicle.id, name: vehicle.name, registration: vehicle.registration, jobs, active: vehicle.is_active };
      })
      .sort((a, b) => b.jobs - a.jobs);

    const trend = buckets(bounds, [
      ...approvedNow.map((row) => ({ at: row.created_at, revenue: Number(row.amount || 0) })),
      ...bookingsNow.map((row) => ({ at: row.created_at, bookings: 1 })),
      ...newCustomers.map((row) => ({ at: row.created_at, customers: 1 })),
    ]);

    const amounts = bookingsNow.map((row) => Number(row.total_amount || 0)).filter((amount) => amount > 0).sort((a, b) => a - b);
    const highValue = amounts.length ? amounts[Math.floor((amounts.length - 1) * 0.75)] : Number.POSITIVE_INFINITY;

    const alerts: { id: string; title: string; detail: string; tone: "warning" | "danger" | "neutral"; module: string }[] = [];
    for (const booking of bookingsNow.filter((row) => row.status === "pending" && Number(row.total_amount || 0) >= highValue && Number(row.total_amount || 0) > 0).slice(0, 3)) {
      alerts.push({
        id: `booking-${booking.id}`,
        title: booking.reference,
        detail: `${customerName(booking)} · pending ${money(booking.total_amount, booking.currency)}`,
        tone: "warning",
        module: "bookings",
      });
    }
    for (const payment of [...outstandingNow].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3)) {
      alerts.push({
        id: `pay-${payment.id}`,
        title: money(payment.amount, payment.currency),
        detail: `${payment.status.replaceAll("_", " ")} · ${payment.bookings?.reference ?? payment.method ?? "Payment"}`,
        tone: "danger",
        module: "payments",
      });
    }
    for (const request of requestRows.filter((row) => inRange(row.created_at, bounds) && (row.status === "new" || row.status === "in_review")).slice(0, 3)) {
      alerts.push({
        id: `req-${request.id}`,
        title: request.subject,
        detail: `${serviceName(request.type)} · ${request.status.replaceAll("_", " ")}`,
        tone: request.status === "new" ? "danger" : "warning",
        module: "requests",
      });
    }
    for (const vehicle of vehicleRows.filter((row) => !row.is_active).slice(0, 3)) {
      alerts.push({
        id: `fleet-${vehicle.id}`,
        title: vehicle.name,
        detail: `${vehicle.registration || "No plate"} · maintenance / out of service`,
        tone: "warning",
        module: "vehicles",
      });
    }

    const activityItems = [
      ...approvedNow.map((row) => ({
        id: `payment-${row.id}`,
        title: "Revenue received",
        detail: `${money(row.amount, row.currency)} · ${row.bookings?.reference ?? row.method ?? "Payment"}`,
        when: row.created_at,
      })),
      ...bookingsNow.map((row) => ({
        id: `booking-${row.id}`,
        title: row.reference,
        detail: `${customerName(row)} · ${money(row.total_amount, row.currency)}`,
        when: row.created_at,
      })),
      ...(activity.data ?? [])
        .filter((row) => inRange(row.created_at, bounds))
        .map((row) => ({
          id: `activity-${row.id}`,
          title: row.title,
          detail: row.description || "Business activity",
          when: row.created_at,
        })),
    ]
      .sort((a, b) => (a.when < b.when ? 1 : -1))
      .slice(0, 8);

    const serviceVolume = [...bookingsByKind.entries()]
      .map(([kind, volume]) => ({ kind, label: serviceName(kind), volume }))
      .sort((a, b) => b.volume - a.volume);

    return {
      revenue,
      revenuePrev,
      monthRevenue,
      bookings: bookingsNow.length,
      bookingsPrev: prior ? bookingsPrev.length : null,
      activeCustomers: activeCustomers.length,
      totalCustomers: peopleNow.length,
      newCustomers: newCustomers.length,
      newCustomersPrev,
      returning: returning.size,
      propertyUtilisation: percent(occupied.size, activeProperties.length),
      fleetUtilisation: percent(assigned.size, activeFleet.length || vehicleRows.length),
      outstanding,
      outstandingCount: outstandingNow.length,
      services: [...bookingsByKind.values()].reduce((sum, count) => sum + count, 0),
      revenueByService: [...revenueByKind.entries()]
        .map(([kind, value]) => ({ label: serviceName(kind), value: Math.round(value) }))
        .sort((a, b) => b.value - a.value),
      serviceVolume,
      propertyRows: propertyRows.slice(0, 5),
      fleetRows: fleetRows.slice(0, 5),
      transactions: [...paymentsNow].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 6),
      trend,
      alerts: alerts.slice(0, 8),
      activityItems,
      occupied: occupied.size,
      properties: activeProperties.length,
      assigned: assigned.size,
      fleet: activeFleet.length,
    };
  }, [activity.data, apartments.data, bookings.data, bounds, customers.data, payments.data, prior, requests.data, transfers.data, vehicles.data]);

  const unread = (notifications.data ?? []).filter((row) => !row.is_read).length;
  const roleLabel = isSuperAdmin ? "Super Administrator" : (roles?.[0] ?? "staff").replaceAll("_", " ");
  const initials = (profile?.full_name || profile?.email || "BKS")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const periodLabel = bounds.start ? `${formatDay(bounds.start)} – ${formatDay(bounds.end)}` : `All activity to ${formatDay(bounds.end)}`;

  if (loading && !(bookings.data || payments.data)) return <AdminSkeleton />;

  const kpis = [
    { label: "Total Revenue", value: money(model.revenue), delta: delta(model.revenue, model.revenuePrev), to: "/admin/payments", icon: CircleDollarSign },
    { label: "Monthly Revenue", value: money(model.monthRevenue), delta: bounds.end.toLocaleString("en-GB", { month: "long", year: "numeric" }), to: "/admin/payments", icon: CircleDollarSign },
    { label: "Total Bookings", value: String(model.bookings), delta: delta(model.bookings, model.bookingsPrev), to: "/admin/bookings", icon: BookOpenCheck },
    { label: "Active Customers", value: String(model.activeCustomers), delta: `${model.totalCustomers} in view`, to: "/admin/customers", icon: Users },
    { label: "Property Utilisation", value: model.propertyUtilisation, delta: `${model.occupied} of ${model.properties}`, to: "/admin/apartments", icon: Building2 },
    { label: "Fleet Utilisation", value: model.fleetUtilisation, delta: `${model.assigned} of ${model.fleet}`, to: "/admin/vehicles", icon: Car },
    { label: "Outstanding Payments", value: money(model.outstanding), delta: `${model.outstandingCount} open`, to: "/admin/payments", icon: CreditCard },
    { label: "Total Services", value: String(model.services), delta: "Bookings and requests", to: "/admin/bookings", icon: Layers },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <AdminPageHeading
          eyebrow="Executive oversight"
          title="Executive Dashboard"
          description="Business performance, financial visibility and executive insight. Live operational control stays in the Operations Center."
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Date range
            <select
              className="h-10 rounded-full border border-input bg-background px-3 text-sm font-semibold normal-case tracking-normal text-foreground"
              value={preset}
              onChange={(event) => setPreset(event.target.value as Preset)}
            >
              {PRESETS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            From
            <Input
              type="date"
              value={customStart}
              onChange={(event) => {
                setCustomStart(event.target.value);
                setPreset("custom");
              }}
              className="h-10 w-[11rem] rounded-full"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            To
            <Input
              type="date"
              value={customEnd}
              onChange={(event) => {
                setCustomEnd(event.target.value);
                setPreset("custom");
              }}
              className="h-10 w-[11rem] rounded-full"
            />
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative mt-4 sm:mt-5">
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
                {(notifications.data ?? []).length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No notifications.</p>
                ) : (
                  (notifications.data ?? []).slice(0, 6).map((row) => (
                    <Link key={row.id} to="/admin/$module" params={{ module: "notifications" }} className="block border-b px-4 py-3 hover:bg-accent">
                      <p className="text-sm font-semibold">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.description || formatWhen(row.created_at)}</p>
                    </Link>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          <div className="mt-4 flex items-center gap-3 rounded-full border bg-card px-3 py-1.5 shadow-soft sm:mt-5">
            <Avatar className="size-9 border">
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile?.full_name || profile?.email || "Administrator"}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{roleLabel}</p>
            </div>
            <ShieldCheck className="size-4 text-primary" />
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold text-muted-foreground">{periodLabel} · updates automatically when bookings, payments and customers change</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Section title="Performance Analytics" hint="Trends for the selected period">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <TrendChart title="Revenue trend" data={model.trend} dataKey="revenue" config={revenueConfig} empty="No approved revenue in this period." />
          <TrendChart title="Booking trend" data={model.trend} dataKey="bookings" config={bookingConfig} empty="No bookings in this period." />
          <TrendChart title="Customer growth" data={model.trend} dataKey="customers" config={customerConfig} empty="No new customers in this period." />
          <AdminPanel>
            <h3 className="font-display text-base font-bold">Service utilisation</h3>
            {model.serviceVolume.length === 0 ? (
              <Empty text="No service volume in this period." />
            ) : (
              <ChartContainer config={serviceConfig} className="mt-3 aspect-auto h-56 w-full">
                <BarChart data={model.serviceVolume} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={110} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="volume" fill="var(--color-volume)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </AdminPanel>
        </div>
      </Section>

      <Section title="Business Performance" hint="Where revenue and demand are coming from">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <RankList title="Revenue by service" rows={model.revenueByService.map((row) => ({ label: row.label, value: money(row.value) }))} empty="No captured revenue to attribute." />
          <RankList title="Bookings by service" rows={model.serviceVolume.map((row) => ({ label: row.label, value: String(row.volume) }))} empty="No bookings or requests in this period." />
          <AdminPanel>
            <h3 className="font-display text-base font-bold">Property performance</h3>
            {model.propertyRows.length === 0 ? <Empty text="No properties in the portfolio yet." /> : (
              <ul className="mt-4 divide-y">
                {model.propertyRows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.stays} stays in period</p>
                    </div>
                    <span className="font-semibold tabular-nums">{money(row.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
          <AdminPanel>
            <h3 className="font-display text-base font-bold">Fleet performance</h3>
            {model.fleetRows.length === 0 ? <Empty text="No vehicles in the fleet yet." /> : (
              <ul className="mt-4 divide-y">
                {model.fleetRows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.registration || "No plate"} · {row.jobs} assignments</p>
                    </div>
                    <StatusDot label={row.active ? "In service" : "Maintenance"} tone={row.active ? "success" : "warning"} />
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>
      </Section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <AdminPanel className="min-w-0">
          <h2 className="font-display text-lg font-bold">Financial Overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Revenue received" value={money(model.revenue)} />
            <Metric label="Pending payments" value={String(model.outstandingCount)} />
            <Metric label="Outstanding amounts" value={money(model.outstanding)} />
          </div>
          <h3 className="mt-6 text-sm font-semibold">Recent transactions</h3>
          <div className="mt-3 max-w-full overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3 font-semibold">When</th>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {model.transactions.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-muted-foreground">No transactions in this period.</td></tr>
                ) : model.transactions.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-3 text-muted-foreground">{formatWhen(row.created_at)}</td>
                    <td className="py-3 font-semibold">{row.bookings?.reference ?? row.reference ?? "—"}</td>
                    <td className="py-3">{row.method || "—"}</td>
                    <td className="py-3 tabular-nums">{money(row.amount, row.currency)}</td>
                    <td className="py-3"><StatusPill status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel>
            <h2 className="font-display text-lg font-bold">Customer Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Total customers" value={String(model.totalCustomers)} />
              <Metric label="New customers" value={String(model.newCustomers)} hint={delta(model.newCustomers, model.newCustomersPrev)} />
              <Metric label="Active customers" value={String(model.activeCustomers)} />
              <Metric label="Returning customers" value={String(model.returning)} />
            </div>
          </AdminPanel>
          <AdminPanel>
            <h2 className="font-display text-lg font-bold">Executive Alerts</h2>
            {model.alerts.length === 0 ? <Empty text="Nothing in this period needs executive attention." /> : (
              <ul className="mt-4 space-y-3">
                {model.alerts.map((alert) => (
                  <li key={alert.id} className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{alert.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{alert.detail}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/$module" params={{ module: alert.module }}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>
      </div>

      <AdminPanel>
        <h2 className="font-display text-lg font-bold">Recent Activity</h2>
        <p className="mt-1 text-xs text-muted-foreground">Significant bookings, revenue and recorded business activity.</p>
        {model.activityItems.length === 0 ? <Empty text="Major transactions will appear here as they are recorded." /> : (
          <ul className="mt-4 divide-y">
            {model.activityItems.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatWhen(item.when)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function TrendChart({
  title,
  data,
  dataKey,
  config,
  empty,
}: {
  title: string;
  data: { label: string; revenue: number; bookings: number; customers: number }[];
  dataKey: "revenue" | "bookings" | "customers";
  config: ChartConfig;
  empty: string;
}) {
  const hasValue = data.some((row) => row[dataKey] > 0);
  return (
    <AdminPanel>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {!hasValue ? <Empty text={empty} /> : (
        <ChartContainer config={config} className="mt-3 aspect-auto h-56 w-full">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey={dataKey} stroke={`var(--color-${dataKey})`} fill={`var(--color-${dataKey})`} fillOpacity={0.18} strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      )}
    </AdminPanel>
  );
}

function RankList({ title, rows, empty }: { title: string; rows: { label: string; value: string }[]; empty: string }) {
  const max = rows.length;
  return (
    <AdminPanel>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {rows.length === 0 ? <Empty text={empty} /> : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 6).map((row, index) => (
            <li key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="tabular-nums font-semibold">{row.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full bg-primary")} style={{ width: `${Math.max(12, ((max - index) / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">{text}</p>;
}
