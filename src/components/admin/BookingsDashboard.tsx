import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Clock3,
  LoaderCircle,
  Radio,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminPanel, AdminSkeleton } from "@/components/admin/AdminUI";
import { StatusPill, money } from "@/components/portal/status";
import { useMyRoles } from "@/hooks/useAdmin";
import {
  useAddBookingNote,
  useAdminActivity,
  useAdminApartments,
  useAdminBookings,
  useAdminNotifications,
  useAdminPayments,
  useAdminRealtime,
  useAdminTransfers,
  useAdminVehicles,
  useRescheduleBooking,
  useUpdateBooking,
  useUpdateBookingService,
  useUpdateTransfer,
  type AdminBooking,
} from "@/hooks/useAdminData";
import { useProfile } from "@/hooks/usePortal";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const ZONE = "Africa/Lusaka";
const PAGE_SIZE = 10;

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type BookingStatus = (typeof STATUSES)[number]["value"];
type SortKey = "reference" | "customer" | "service" | "date" | "amount" | "status" | "created";

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
};

const KPI_META: { key: "all" | BookingStatus; label: string; icon: typeof BookOpenCheck }[] = [
  { key: "all", label: "Total Bookings", icon: BookOpenCheck },
  { key: "pending", label: "Pending", icon: Clock3 },
  { key: "approved", label: "Confirmed", icon: CheckCircle2 },
  { key: "in_progress", label: "In Progress", icon: LoaderCircle },
  { key: "completed", label: "Completed", icon: CircleCheck },
  { key: "cancelled", label: "Cancelled", icon: Ban },
];

function statusLabel(status: string) {
  return STATUSES.find((item) => item.value === status)?.label ?? status.replaceAll("_", " ");
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatClock(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Math.abs(minutes) < 1) return "Just now";
  if (Math.abs(minutes) < 60) return `${Math.abs(minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h ago`;
  return `${Math.abs(Math.round(hours / 24))}d ago`;
}

function customerName(booking: AdminBooking) {
  return booking.profiles?.full_name || booking.profiles?.email || "Customer";
}

function serviceName(booking: AdminBooking) {
  const labels = (booking.booking_services ?? []).map((service) => service.label).filter(Boolean);
  if (labels.length) return labels.join(", ");
  return booking.title || "BKS service";
}

function bookingDay(booking: AdminBooking) {
  return booking.start_date || booking.created_at.slice(0, 10);
}

function textFromDetails(details: Json, keys: string[]) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  const record = details as Record<string, Json | undefined>;
  return keys.flatMap((key) => {
    const value = record[key];
    return typeof value === "string" && value.trim() ? [value.trim()] : [];
  });
}

function moveInstant(iso: string | null, date: string | null) {
  if (!iso || !date) return iso;
  const previous = new Date(iso);
  const [year, month, day] = date.split("-").map(Number);
  if (Number.isNaN(previous.getTime()) || !year || !month || !day) return iso;
  const next = new Date(previous);
  next.setFullYear(year, month - 1, day);
  return next.toISOString();
}

function locationFor(
  booking: AdminBooking,
  apartments: Map<string, Tables<"apartments">>,
  transfers: Tables<"airport_transfers">[],
) {
  const parts: string[] = [];
  for (const service of booking.booking_services ?? []) {
    if (service.apartment_id) {
      const apartment = apartments.get(service.apartment_id);
      if (apartment)
        parts.push([apartment.name, apartment.address, apartment.city].filter(Boolean).join(", "));
    }
    parts.push(
      ...textFromDetails(service.details, ["location", "address", "city", "pickup", "destination"]),
    );
  }
  for (const transfer of transfers) {
    const line = [transfer.pickup_location, transfer.airport].filter(Boolean).join(" → ");
    if (line) parts.push(line);
  }
  return [...new Set(parts)].join(" · ") || "—";
}

function scheduleFor(booking: AdminBooking, transfers: Tables<"airport_transfers">[]) {
  const windows = (booking.booking_services ?? [])
    .filter((service) => service.start_at || service.end_at)
    .map((service) => `${formatClock(service.start_at)} – ${formatClock(service.end_at)}`);
  if (windows.length) return windows.join(", ");
  const arrival = transfers.find((transfer) => transfer.arrival_at)?.arrival_at;
  return arrival ? formatClock(arrival) : "—";
}

function assignedFor(
  booking: AdminBooking,
  apartments: Map<string, Tables<"apartments">>,
  vehicles: Map<string, Tables<"vehicles">>,
  transfers: (Tables<"airport_transfers"> & {
    vehicles: { name: string; registration: string | null } | null;
  })[],
) {
  const parts: string[] = [];
  for (const service of booking.booking_services ?? []) {
    if (service.apartment_id) {
      const apartment = apartments.get(service.apartment_id);
      if (apartment) parts.push(apartment.name);
    }
    if (service.vehicle_id) {
      const vehicle = vehicles.get(service.vehicle_id);
      if (vehicle)
        parts.push(
          vehicle.registration ? `${vehicle.name} (${vehicle.registration})` : vehicle.name,
        );
    }
  }
  for (const transfer of transfers) {
    if (transfer.driver_name) parts.push(transfer.driver_name);
    if (transfer.vehicles?.name) parts.push(transfer.vehicles.name);
  }
  return [...new Set(parts)].join(", ") || "Unassigned";
}

export function BookingsDashboard() {
  const live = useAdminRealtime();
  const { isSuperAdmin, roles } = useMyRoles();
  const { data: profile } = useProfile();
  const bookings = useAdminBookings();
  const payments = useAdminPayments();
  const transfers = useAdminTransfers();
  const apartments = useAdminApartments();
  const vehicles = useAdminVehicles();
  const notifications = useAdminNotifications();
  const activity = useAdminActivity();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [service, setService] = useState("all");
  const [customer, setCustomer] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => bookings.data ?? [], [bookings.data]);
  const apartmentRows = apartments.data;
  const vehicleRows = vehicles.data;
  const transferRows = transfers.data;
  const apartmentMap = useMemo(
    () => new Map((apartmentRows ?? []).map((apartment) => [apartment.id, apartment])),
    [apartmentRows],
  );
  const vehicleMap = useMemo(
    () => new Map((vehicleRows ?? []).map((vehicle) => [vehicle.id, vehicle])),
    [vehicleRows],
  );
  const transfersByBooking = useMemo(() => {
    const map = new Map<string, NonNullable<typeof transferRows>>();
    for (const transfer of transferRows ?? []) {
      const current = map.get(transfer.booking_id) ?? [];
      current.push(transfer);
      map.set(transfer.booking_id, current);
    }
    return map;
  }, [transferRows]);

  const counts = useMemo(() => {
    const tally: Record<"all" | BookingStatus, number> = {
      all: rows.length,
      pending: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of rows) tally[row.status] += 1;
    return tally;
  }, [rows]);

  const customers = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) map.set(row.user_id, customerName(row));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (customer !== "all" && row.user_id !== customer) return false;
      if (service !== "all" && !(row.booking_services ?? []).some((item) => item.kind === service))
        return false;
      const day = row.start_date;
      if ((from || to) && !day) return false;
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!term) return true;
      const transferRows = transfersByBooking.get(row.id) ?? [];
      const haystack = [
        row.reference,
        customerName(row),
        row.profiles?.email,
        serviceName(row),
        row.title,
        locationFor(row, apartmentMap, transferRows),
        assignedFor(row, apartmentMap, vehicleMap, transferRows),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    const valueOf = (row: AdminBooking) => {
      if (sortKey === "customer") return customerName(row).toLowerCase();
      if (sortKey === "service") return serviceName(row).toLowerCase();
      if (sortKey === "date") return bookingDay(row);
      if (sortKey === "amount") return row.total_amount;
      if (sortKey === "status") return row.status;
      if (sortKey === "created") return row.created_at;
      return row.reference.toLowerCase();
    };
    list.sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);
      const order = left < right ? -1 : left > right ? 1 : 0;
      return sortDir === "asc" ? order : -order;
    });
    return list;
  }, [
    apartmentMap,
    customer,
    from,
    rows,
    search,
    service,
    sortDir,
    sortKey,
    status,
    to,
    transfersByBooking,
    vehicleMap,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, status, service, customer, from, to, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const notificationRows = notifications.data ?? [];
  const unread = notificationRows.filter((row) => !row.is_read).length;
  const bookingActivity = (activity.data ?? []).filter((event) =>
    /booking/i.test(`${event.title} ${event.description ?? ""}`),
  );
  const roleLabel = isSuperAdmin
    ? "Super Administrator"
    : (roles?.[0] ?? "staff").replaceAll("_", " ");
  const initials = (profile?.full_name || profile?.email || "BKS")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "amount" || key === "created" || key === "date" ? "desc" : "asc");
    }
  };

  if (bookings.isLoading && !rows.length) return <AdminSkeleton />;

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-gradient-ink text-ink-foreground shadow-soft">
        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              Booking management
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Bookings Dashboard</h1>
            <p className="mt-1 text-sm text-ink-foreground/70">
              Confirm, assign and follow every booking as it changes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold">
              <Radio
                className={cn(
                  "size-3",
                  live === "live" ? "animate-pulse text-gold" : "text-ink-foreground/50",
                )}
              />
              {live === "live"
                ? "Realtime live"
                : live === "connecting"
                  ? "Connecting"
                  : "Realtime offline"}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="glass"
                  size="sm"
                  className="relative border-white/10 bg-white/5 text-ink-foreground"
                >
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
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      No booking alerts yet.
                    </p>
                  ) : (
                    notificationRows.slice(0, 8).map((row) => (
                      <div key={row.id} className="border-b px-4 py-3">
                        <p className="text-sm font-semibold">{row.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.description || relativeTime(row.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <Avatar className="size-9 border border-white/10">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.full_name || profile?.email || "Administrator"}
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-foreground/50">
                  {roleLabel}
                </p>
              </div>
              <ShieldCheck className="size-4 text-gold" />
            </div>
          </div>
        </div>
      </section>

      {bookings.isError && (
        <AdminPanel>
          <p className="text-sm text-destructive">
            Bookings could not be loaded. {bookings.error.message}
          </p>
        </AdminPanel>
      )}

      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPI_META.map((item) => {
          const Icon = item.icon;
          const active = status === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(active && item.key !== "all" ? "all" : item.key)}
              className={cn(
                "rounded-lg border bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary",
                active ? "border-primary shadow-gold" : "border-border",
              )}
            >
              <span className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              <p className="mt-4 text-xs font-semibold text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{counts[item.key]}</p>
            </button>
          );
        })}
      </div>

      <AdminPanel className="min-w-0">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference, customer, service"
              aria-label="Search bookings"
            />
          </label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as "all" | BookingStatus)}
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger aria-label="Filter by service">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {Object.entries(SERVICE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger aria-label="Filter by customer">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {customers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
            />
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            {visible.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                {rows.length === 0
                  ? "No bookings yet. A new customer booking will appear here automatically."
                  : "No bookings match these filters."}
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {visible.map((row) => {
                    const bookingTransfers = transfersByBooking.get(row.id) ?? [];
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className="w-full rounded-md border border-border p-3 text-left hover:border-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{row.reference}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {customerName(row)}
                            </p>
                          </div>
                          <StatusPill status={row.status} label={statusLabel(row.status)} />
                        </div>
                        <p className="mt-2 text-sm">{serviceName(row)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDay(row.start_date)} · {money(row.total_amount, row.currency)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {assignedFor(row, apartmentMap, vehicleMap, bookingTransfers)}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="hidden max-w-full overflow-x-auto md:block">
                  <table className="w-full min-w-[72rem] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <SortHeader
                          label="Booking ID"
                          column="reference"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <SortHeader
                          label="Customer"
                          column="customer"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <SortHeader
                          label="Service"
                          column="service"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <SortHeader
                          label="Booking date"
                          column="date"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <th className="px-3 py-2">Start / end</th>
                        <th className="px-3 py-2">Location</th>
                        <SortHeader
                          label="Amount"
                          column="amount"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <SortHeader
                          label="Status"
                          column="status"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <th className="px-3 py-2">Assigned</th>
                        <SortHeader
                          label="Created"
                          column="created"
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => {
                        const bookingTransfers = transfersByBooking.get(row.id) ?? [];
                        return (
                          <tr key={row.id} className="border-t border-border">
                            <td className="px-3 py-3 font-semibold">{row.reference}</td>
                            <td className="px-3 py-3">
                              <p>{customerName(row)}</p>
                              <p className="text-xs text-muted-foreground">{row.profiles?.email}</p>
                            </td>
                            <td className="px-3 py-3">{serviceName(row)}</td>
                            <td className="px-3 py-3">{formatDay(row.start_date)}</td>
                            <td className="px-3 py-3">{scheduleFor(row, bookingTransfers)}</td>
                            <td className="max-w-[14rem] px-3 py-3">
                              {locationFor(row, apartmentMap, bookingTransfers)}
                            </td>
                            <td className="px-3 py-3">{money(row.total_amount, row.currency)}</td>
                            <td className="px-3 py-3">
                              <StatusPill status={row.status} label={statusLabel(row.status)} />
                            </td>
                            <td className="px-3 py-3">
                              {assignedFor(row, apartmentMap, vehicleMap, bookingTransfers)}
                            </td>
                            <td className="px-3 py-3">{formatWhen(row.created_at)}</td>
                            <td className="px-3 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedId(row.id)}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>
                {filtered.length === 0
                  ? "0 bookings"
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <span>
                  {currentPage} / {pageCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>

          <aside className="min-w-0 rounded-md border border-border p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Recent activity
            </p>
            <div className="mt-3 space-y-3">
              {bookingActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Booking activity will appear here as customers and staff act.
                </p>
              ) : (
                bookingActivity.slice(0, 8).map((event) => (
                  <div key={event.id} className="border-b border-border pb-3 last:border-0">
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {relativeTime(event.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </AdminPanel>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto">
          {selected && (
            <BookingDetail
              booking={selected}
              apartments={apartments.data ?? []}
              vehicles={vehicles.data ?? []}
              transfers={transfersByBooking.get(selected.id) ?? []}
              payments={(payments.data ?? []).filter(
                (payment) => payment.booking_id === selected.id,
              )}
              apartmentMap={apartmentMap}
              vehicleMap={vehicleMap}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  const Icon = active && sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        className="inline-flex items-center gap-1"
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className={cn("size-3", active ? "opacity-100" : "opacity-30")} />
      </button>
    </th>
  );
}

function BookingDetail({
  booking,
  apartments,
  vehicles,
  transfers,
  payments,
  apartmentMap,
  vehicleMap,
}: {
  booking: AdminBooking;
  apartments: Tables<"apartments">[];
  vehicles: Tables<"vehicles">[];
  transfers: (Tables<"airport_transfers"> & {
    vehicles: { name: string; registration: string | null } | null;
  })[];
  payments: (Tables<"payments"> & { bookings: { reference: string } | null })[];
  apartmentMap: Map<string, Tables<"apartments">>;
  vehicleMap: Map<string, Tables<"vehicles">>;
}) {
  const updateBooking = useUpdateBooking();
  const reschedule = useRescheduleBooking();
  const assignService = useUpdateBookingService();
  const updateTransfer = useUpdateTransfer();
  const addNote = useAddBookingNote();
  const [statusDraft, setStatusDraft] = useState(booking.status);
  const [startDate, setStartDate] = useState(booking.start_date ?? "");
  const [endDate, setEndDate] = useState(booking.end_date ?? "");
  const [note, setNote] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [drivers, setDrivers] = useState<Record<string, string>>({});

  const history = useQuery({
    queryKey: ["admin", "booking-history", booking.id],
    queryFn: async () => {
      const [{ data: audits, error: auditError }, { data: events, error: eventError }] =
        await Promise.all([
          supabase
            .from("audit_logs")
            .select("*")
            .eq("entity_type", "bookings")
            .eq("entity_id", booking.id)
            .order("created_at", { ascending: false })
            .limit(40),
          supabase
            .from("activity_events")
            .select("*")
            .eq("user_id", booking.user_id)
            .order("created_at", { ascending: false })
            .limit(40),
        ]);
      if (auditError) throw auditError;
      if (eventError) throw eventError;
      const auditRows = (audits ?? []).map((row) => ({
        id: row.id,
        at: row.created_at,
        title: auditTitle(row.action),
        detail: auditDetail(row),
      }));
      const eventRows = (events ?? [])
        .filter((event) => `${event.title} ${event.description ?? ""}`.includes(booking.reference))
        .map((event) => ({
          id: event.id,
          at: event.created_at,
          title: event.title,
          detail: event.description ?? "",
        }));
      return [...auditRows, ...eventRows].sort((a, b) => (a.at < b.at ? 1 : -1));
    },
  });

  useEffect(() => {
    setStatusDraft(booking.status);
    setStartDate(booking.start_date ?? "");
    setEndDate(booking.end_date ?? "");
    setConfirmReject(false);
  }, [booking.id, booking.status, booking.start_date, booking.end_date, booking.updated_at]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const transfer of transfers) next[transfer.id] = transfer.driver_name ?? "";
    setDrivers(next);
  }, [booking.id, transfers]);

  const busy =
    updateBooking.isPending ||
    reschedule.isPending ||
    assignService.isPending ||
    updateTransfer.isPending;
  const internalNotes = (history.data ?? []).filter((item) => item.title === "Internal note");

  const applyStatus = (next: BookingStatus, action = "booking.update") => {
    const patch: Partial<Tables<"bookings">> = { status: next };
    if (next === "approved" && booking.stage === "submitted") patch.stage = "approved";
    if (next === "completed") patch.stage = "completed";
    if (next === "pending") patch.stage = "submitted";
    updateBooking.mutate({ id: booking.id, reference: booking.reference, patch, action });
  };

  const saveSchedule = () => {
    if (startDate && endDate && endDate < startDate) return;
    const services = (booking.booking_services ?? [])
      .filter((service) => service.start_at || service.end_at)
      .map((service) => ({
        id: service.id,
        start_at: moveInstant(service.start_at, startDate || null),
        end_at: moveInstant(service.end_at, endDate || startDate || null),
      }));
    reschedule.mutate({
      id: booking.id,
      reference: booking.reference,
      startDate: startDate || null,
      endDate: endDate || null,
      services,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{booking.reference}</DialogTitle>
        <DialogDescription>{serviceName(booking)}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={booking.status} label={statusLabel(booking.status)} />
        <span className="text-xs text-muted-foreground">
          Stage {booking.stage.replaceAll("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailBlock title="Customer">
          <p className="font-semibold">{customerName(booking)}</p>
          <p>{booking.profiles?.email || "No email"}</p>
          <p>{booking.profiles?.phone || "No phone"}</p>
        </DetailBlock>
        <DetailBlock title="Schedule">
          <p>
            Date {formatDay(booking.start_date)}
            {booking.end_date ? ` – ${formatDay(booking.end_date)}` : ""}
          </p>
          <p>Time {scheduleFor(booking, transfers)}</p>
          <p>Created {formatWhen(booking.created_at)}</p>
        </DetailBlock>
        <DetailBlock title="Location">
          <p>{locationFor(booking, apartmentMap, transfers)}</p>
        </DetailBlock>
        <DetailBlock title="Assigned resources">
          <p>{assignedFor(booking, apartmentMap, vehicleMap, transfers)}</p>
        </DetailBlock>
      </div>

      <DetailBlock title="Service details">
        {(booking.booking_services ?? []).length === 0 ? (
          <p>{booking.title || "No service lines on this booking."}</p>
        ) : (
          <ul className="space-y-2">
            {(booking.booking_services ?? []).map((service) => (
              <li key={service.id} className="rounded-md border border-border px-3 py-2">
                <p className="font-semibold">{service.label}</p>
                <p className="text-xs text-muted-foreground">
                  {SERVICE_LABEL[service.kind] ?? service.kind} ·{" "}
                  {money(service.amount, booking.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DetailBlock>

      <DetailBlock title="Payment">
        <p className="font-semibold">
          Booking total {money(booking.total_amount, booking.currency)}
        </p>
        {payments.length === 0 ? (
          <p className="mt-2">No payments recorded.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {money(payment.amount, payment.currency)} · {payment.method || "Method not set"}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </span>
                <StatusPill status={payment.status} />
              </li>
            ))}
          </ul>
        )}
      </DetailBlock>

      <DetailBlock title="Notes">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Customer notes
        </p>
        <p className="mt-1">{booking.notes || "No customer notes."}</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Internal notes
        </p>
        {internalNotes.length === 0 ? (
          <p className="mt-1">No internal notes.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {internalNotes.map((item) => (
              <li key={item.id}>
                <p>{item.detail}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatWhen(item.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          className="mt-3"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add an internal note"
          aria-label="Internal note"
        />
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          disabled={!note.trim() || addNote.isPending}
          onClick={() => {
            addNote.mutate(
              { id: booking.id, reference: booking.reference, note: note.trim() },
              { onSuccess: () => setNote("") },
            );
          }}
        >
          Add internal note
        </Button>
      </DetailBlock>

      <DetailBlock title="Admin actions">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || booking.status === "approved"}
            onClick={() => applyStatus("approved")}
          >
            Confirm
          </Button>
          {confirmReject ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => applyStatus("cancelled", "booking.reject")}
            >
              Confirm reject
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || booking.status === "cancelled"}
              onClick={() => setConfirmReject(true)}
            >
              Reject
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || booking.status === "cancelled"}
            onClick={() => applyStatus("cancelled", "booking.cancel")}
          >
            Cancel
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Select
            value={statusDraft}
            onValueChange={(value) => setStatusDraft(value as BookingStatus)}
          >
            <SelectTrigger aria-label="Update status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || statusDraft === booking.status}
            onClick={() => applyStatus(statusDraft)}
          >
            Update status
          </Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-label="Reschedule start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            aria-label="Reschedule end date"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (!!startDate && !!endDate && endDate < startDate)}
            onClick={saveSchedule}
          >
            Reschedule
          </Button>
        </div>
        {startDate && endDate && endDate < startDate && (
          <p className="mt-2 text-xs text-destructive">
            End date must be on or after the start date.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {(booking.booking_services ?? []).map((service) => (
            <div key={service.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <p className="text-sm font-semibold sm:col-span-2">{service.label}</p>
              {(service.kind === "apartment" || service.apartment_id) && (
                <Select
                  value={service.apartment_id ?? "none"}
                  onValueChange={(value) =>
                    assignService.mutate({
                      id: service.id,
                      bookingId: booking.id,
                      reference: booking.reference,
                      patch: { apartment_id: value === "none" ? null : value },
                    })
                  }
                >
                  <SelectTrigger aria-label={`Assign property for ${service.label}`}>
                    <SelectValue placeholder="Property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned property</SelectItem>
                    {apartments.map((apartment) => (
                      <SelectItem key={apartment.id} value={apartment.id}>
                        {apartment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(service.kind === "vehicle" ||
                service.kind === "airport_transfer" ||
                service.vehicle_id) && (
                <Select
                  value={service.vehicle_id ?? "none"}
                  onValueChange={(value) =>
                    assignService.mutate({
                      id: service.id,
                      bookingId: booking.id,
                      reference: booking.reference,
                      patch: { vehicle_id: value === "none" ? null : value },
                    })
                  }
                >
                  <SelectTrigger aria-label={`Assign vehicle for ${service.label}`}>
                    <SelectValue placeholder="Vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned vehicle</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration
                          ? `${vehicle.name} (${vehicle.registration})`
                          : vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
          {transfers.map((transfer) => (
            <div key={transfer.id} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={drivers[transfer.id] ?? ""}
                onChange={(event) =>
                  setDrivers((current) => ({ ...current, [transfer.id]: event.target.value }))
                }
                placeholder="Assigned driver"
                aria-label="Assigned driver"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  updateTransfer.mutate({
                    id: transfer.id,
                    patch: { driver_name: drivers[transfer.id]?.trim() || null },
                  })
                }
              >
                Assign staff
              </Button>
            </div>
          ))}
        </div>
      </DetailBlock>

      <DetailBlock title="Booking history">
        {history.isLoading ? (
          <p>Loading activity…</p>
        ) : (history.data ?? []).length === 0 ? (
          <p>No activity recorded for this booking yet.</p>
        ) : (
          <ul className="space-y-3">
            {(history.data ?? []).map((item) => (
              <li key={item.id} className="border-b border-border pb-3 last:border-0">
                <p className="font-semibold">{item.title}</p>
                {item.detail && <p className="mt-1">{item.detail}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatWhen(item.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DetailBlock>
    </>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function auditTitle(action: string) {
  if (action === "booking.note") return "Internal note";
  if (action === "booking.reject") return "Booking rejected";
  if (action === "booking.cancel") return "Booking cancelled";
  if (action === "booking.reschedule") return "Rescheduled";
  if (action === "booking.assign") return "Resources assigned";
  if (action === "booking.update") return "Booking updated";
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

function auditDetail(row: Tables<"audit_logs">) {
  const details = row.details;
  if (!details || typeof details !== "object" || Array.isArray(details))
    return row.actor_email ?? "";
  const record = details as Record<string, Json | undefined>;
  if (typeof record.note === "string") return record.note;
  const status = typeof record.status === "string" ? statusLabel(record.status) : "";
  const actor = row.actor_email ?? "Staff";
  return [status && `Status ${status}`, actor].filter(Boolean).join(" · ");
}
