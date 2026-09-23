import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Car,
  Gauge,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Radio,
  Search,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminPanel, AdminSkeleton } from "@/components/admin/AdminUI";
import { money } from "@/components/portal/status";
import {
  useAdminBookings,
  useAdminRealtime,
  useAdminTransfers,
  useAdminVehicles,
  type AdminBooking,
} from "@/hooks/useAdminData";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import { toast } from "sonner";
import {
  useAdminMaintenance,
  useAssignVehicle,
  useReleaseVehicle,
  useSaveMaintenance,
  useSaveVehicle,
  useSetVehicleHold,
  useVehicleImages,
  type FleetVehicle,
  type MaintenanceInput,
  type MaintenanceRow,
  type VehicleInput,
} from "@/hooks/useFleet";
import {
  FUEL_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  blankToNull,
  maintenanceTone,
  moneyAmount,
  optionalInt,
  statusLabel,
  statusTone,
  vehicleModelLine,
  type MaintenanceStatus,
  type VehicleStatus,
} from "@/lib/fleet";
import { cn } from "@/lib/utils";

const ZONE = "Africa/Lusaka";

type FormState = {
  name: string;
  registration: string;
  make: string;
  model: string;
  year: string;
  category: string;
  mileage: string;
  fuel_type: string;
  transmission: string;
  seats: string;
  daily_rate: string;
  hourly_rate: string;
  fuel_policy: string;
  insurance_info: string;
  notes: string;
};

type MaintenanceForm = {
  id?: string;
  maintenance_type: string;
  serviced_on: string;
  mileage: string;
  cost: string;
  next_service_on: string;
  status: MaintenanceStatus;
  notes: string;
  hold: "maintenance" | "available" | "none";
};

const EMPTY_FORM: FormState = {
  name: "",
  registration: "",
  make: "",
  model: "",
  year: "",
  category: "",
  mileage: "",
  fuel_type: "",
  transmission: "",
  seats: "5",
  daily_rate: "",
  hourly_rate: "",
  fuel_policy: "",
  insurance_info: "",
  notes: "",
};

function todayStamp() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date());
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

function unique(values: (string | null | undefined)[], presets: string[] = []) {
  return [
    ...new Set([...presets, ...values.filter((value): value is string => Boolean(value?.trim()))]),
  ].sort((a, b) => a.localeCompare(b));
}

function formFromVehicle(vehicle: FleetVehicle): FormState {
  return {
    name: vehicle.name,
    registration: vehicle.registration ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year ? String(vehicle.year) : "",
    category: vehicle.category ?? "",
    mileage: vehicle.mileage != null ? String(vehicle.mileage) : "",
    fuel_type: vehicle.fuel_type ?? "",
    transmission: vehicle.transmission ?? "",
    seats: String(vehicle.seats ?? 5),
    daily_rate: String(vehicle.daily_rate ?? 0),
    hourly_rate: String(vehicle.hourly_rate ?? 0),
    fuel_policy: vehicle.fuel_policy ?? "",
    insurance_info: vehicle.insurance_info ?? "",
    notes: vehicle.notes ?? "",
  };
}

function inputFromForm(form: FormState): VehicleInput | string {
  if (!form.name.trim()) return "Vehicle name is required";
  const year = optionalInt(form.year);
  if (form.year.trim() && (year == null || year < 1950 || year > 2100)) return "Enter a valid year";
  const mileage = optionalInt(form.mileage);
  if (form.mileage.trim() && (mileage == null || mileage < 0)) return "Mileage cannot be negative";
  const seats = optionalInt(form.seats);
  if (seats == null || seats < 1 || seats > 60) return "Capacity must be between 1 and 60";
  const daily = moneyAmount(form.daily_rate);
  const hourly = moneyAmount(form.hourly_rate);
  if (daily < 0 || hourly < 0) return "Rates cannot be negative";
  return {
    name: form.name.trim(),
    registration: blankToNull(form.registration),
    make: blankToNull(form.make),
    model: blankToNull(form.model),
    year,
    category: blankToNull(form.category),
    mileage,
    fuel_type: blankToNull(form.fuel_type),
    transmission: blankToNull(form.transmission),
    seats,
    daily_rate: daily,
    hourly_rate: hourly,
    fuel_policy: blankToNull(form.fuel_policy),
    insurance_info: blankToNull(form.insurance_info),
    notes: blankToNull(form.notes),
  };
}

type Duty = {
  key: string;
  reference: string;
  title: string;
  customer: string;
  when: string;
  phase: "current" | "upcoming";
  sort: string;
};

function dutiesFor(
  vehicleId: string,
  bookings: AdminBooking[],
  transfers: {
    id: string;
    vehicle_id: string | null;
    stage: string;
    arrival_at: string | null;
    airport: string | null;
    pickup_location: string | null;
    flight_number: string | null;
    bookings: { reference: string } | null;
  }[],
): Duty[] {
  const today = todayStamp();
  const duties: Duty[] = [];
  for (const booking of bookings) {
    const linked = (booking.booking_services ?? []).some(
      (service) => service.vehicle_id === vehicleId,
    );
    if (!linked || booking.status === "cancelled" || booking.status === "completed") continue;
    const end = booking.end_date ?? booking.start_date;
    if (end && end < today && booking.status !== "in_progress") continue;
    const current =
      booking.status === "in_progress" ||
      Boolean(booking.start_date && booking.start_date <= today && (!end || end >= today));
    duties.push({
      key: booking.id,
      reference: booking.reference,
      title: booking.title || "Vehicle booking",
      customer: booking.profiles?.full_name || booking.profiles?.email || "Customer",
      when: [formatDay(booking.start_date), booking.end_date ? formatDay(booking.end_date) : null]
        .filter(Boolean)
        .join(" → "),
      phase: current ? "current" : "upcoming",
      sort: booking.start_date ?? booking.created_at,
    });
  }
  for (const transfer of transfers) {
    if (transfer.vehicle_id !== vehicleId || transfer.stage === "completed") continue;
    const moving = ["driver_en_route", "driver_waiting", "picked_up"].includes(transfer.stage);
    duties.push({
      key: transfer.id,
      reference: transfer.bookings?.reference ?? "Transfer",
      title:
        [transfer.flight_number, transfer.airport, transfer.pickup_location]
          .filter(Boolean)
          .join(" · ") || "Airport transfer",
      customer: statusLabel(transfer.stage),
      when: formatWhen(transfer.arrival_at),
      phase: moving ? "current" : "upcoming",
      sort: transfer.arrival_at ?? "",
    });
  }
  return duties.sort((a, b) => a.sort.localeCompare(b.sort));
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold shadow-soft",
        statusTone(status),
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function VehiclePhoto({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={cn("grid place-items-center bg-gradient-ink text-gold", className)}>
        <Car className="size-10" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function VehicleDashboard() {
  const live = useAdminRealtime();
  useRealtimeInvalidate("admin-vehicle-maintenance", ["vehicle_maintenance"]);
  const vehicles = useAdminVehicles();
  const bookings = useAdminBookings();
  const transfers = useAdminTransfers();
  const maintenance = useAdminMaintenance();
  const saveVehicle = useSaveVehicle();
  const setHold = useSetVehicleHold();
  const images = useVehicleImages();
  const assignVehicle = useAssignVehicle();
  const releaseVehicle = useReleaseVehicle();
  const saveMaintenance = useSaveMaintenance();

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [make, setMake] = useState("all");
  const [model, setModel] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [fuel, setFuel] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formVehicle, setFormVehicle] = useState<FleetVehicle | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoVehicleId, setPhotoVehicleId] = useState<string | null>(null);

  const fleet = useMemo(() => vehicles.data ?? [], [vehicles.data]);
  const bookingRows = bookings.data ?? [];
  const transferRows = transfers.data ?? [];
  const maintenanceRows = maintenance.data ?? [];

  const makes = unique(fleet.map((vehicle) => vehicle.make));
  const models = unique(
    fleet
      .filter((vehicle) => make === "all" || vehicle.make === make)
      .map((vehicle) => vehicle.model),
  );
  const types = unique(
    fleet.map((vehicle) => vehicle.category),
    VEHICLE_TYPES,
  );
  const transmissions = unique(
    fleet.map((vehicle) => vehicle.transmission),
    TRANSMISSIONS,
  );
  const fuels = unique(
    fleet.map((vehicle) => vehicle.fuel_type),
    FUEL_TYPES,
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);
    return fleet.filter((vehicle) => {
      if (status !== "all" && vehicle.status !== status) return false;
      if (type !== "all" && (vehicle.category || "Unspecified") !== type) return false;
      if (make !== "all" && vehicle.make !== make) return false;
      if (model !== "all" && vehicle.model !== model) return false;
      if (transmission !== "all" && vehicle.transmission !== transmission) return false;
      if (fuel !== "all" && vehicle.fuel_type !== fuel) return false;
      if (min != null && Number.isFinite(min) && Number(vehicle.daily_rate) < min) return false;
      if (max != null && Number.isFinite(max) && Number(vehicle.daily_rate) > max) return false;
      if (!term) return true;
      const haystack = [
        vehicle.name,
        vehicle.registration,
        vehicle.make,
        vehicle.model,
        vehicle.category,
        vehicle.transmission,
        vehicle.fuel_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [fleet, fuel, make, maxPrice, minPrice, model, search, status, transmission, type]);

  const counts = useMemo(() => {
    const tally: Record<VehicleStatus | "total", number> = {
      total: fleet.length,
      available: 0,
      reserved: 0,
      assigned: 0,
      in_use: 0,
      maintenance: 0,
      unavailable: 0,
    };
    for (const vehicle of fleet) tally[vehicle.status] += 1;
    return tally;
  }, [fleet]);

  const selected = fleet.find((vehicle) => vehicle.id === selectedId) ?? null;
  const assignTarget = fleet.find((vehicle) => vehicle.id === assignId) ?? null;
  const visibleIds = new Set(filtered.map((vehicle) => vehicle.id));
  const visibleMaintenance = maintenanceRows.filter((row) => visibleIds.has(row.vehicle_id));

  const openBookings = bookingRows.filter((booking) =>
    ["pending", "approved", "in_progress"].includes(booking.status),
  );

  const openForm = (vehicle?: FleetVehicle) => {
    setFormVehicle(vehicle ?? null);
    setForm(vehicle ? formFromVehicle(vehicle) : EMPTY_FORM);
    setFormFiles([]);
    setFormOpen(true);
  };

  const openMaintenance = (vehicleId: string, row?: MaintenanceRow) => {
    setMaintenanceVehicleId(vehicleId);
    setMaintenanceForm(
      row
        ? {
            id: row.id,
            maintenance_type: row.maintenance_type,
            serviced_on: row.serviced_on,
            mileage: row.mileage != null ? String(row.mileage) : "",
            cost: row.cost != null ? String(row.cost) : "",
            next_service_on: row.next_service_on ?? "",
            status: row.status,
            notes: row.notes ?? "",
            hold: "none",
          }
        : {
            maintenance_type: "Service",
            serviced_on: todayStamp(),
            mileage: "",
            cost: "",
            next_service_on: "",
            status: "scheduled",
            notes: "",
            hold: "maintenance",
          },
    );
    setMaintenanceOpen(true);
  };

  const changeHold = (vehicle: FleetVehicle, hold: "maintenance" | "unavailable" | null) => {
    setHold.mutate({ id: vehicle.id, hold, name: vehicle.name });
  };

  if (vehicles.isLoading && fleet.length === 0) return <AdminSkeleton />;

  if (vehicles.isError) {
    return (
      <AdminPanel>
        <h1 className="font-display text-2xl font-bold">Fleet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The fleet could not be loaded. {(vehicles.error as Error).message}
        </p>
      </AdminPanel>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-gradient-ink text-ink-foreground shadow-soft">
        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              Fleet management
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Vehicle Dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-foreground/70">
              Photos, availability and assignments for the BKS fleet, updated as bookings change.
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
              {live === "live" ? "Live" : live === "connecting" ? "Connecting" : "Offline"}
            </div>
            <Button variant="gold" onClick={() => openForm()}>
              <Plus /> Add vehicle
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {(
          [
            ["total", "Total Vehicles", counts.total],
            ["available", "Available", counts.available],
            ["reserved", "Reserved", counts.reserved],
            ["assigned", "Assigned", counts.assigned],
            ["in_use", "In Use", counts.in_use],
            ["maintenance", "Maintenance", counts.maintenance],
            ["unavailable", "Unavailable", counts.unavailable],
          ] as const
        ).map(([key, label, value]) => {
          const active = key === "total" ? status === "all" : status === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(key === "total" ? "all" : key)}
              className={cn(
                "rounded-lg border bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary",
                active && "border-primary shadow-gold",
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
            </button>
          );
        })}
      </div>

      <AdminPanel className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle"
              aria-label="Search vehicle"
            />
          </label>
          <FilterSelect
            label="Vehicle type"
            value={type}
            onChange={setType}
            options={[...new Set(["Unspecified", ...types])]}
          />
          <FilterSelect
            label="Availability"
            value={status}
            onChange={setStatus}
            options={VEHICLE_STATUSES.map((item) => item.value)}
            labels={Object.fromEntries(VEHICLE_STATUSES.map((item) => [item.value, item.label]))}
          />
          <FilterSelect
            label="Make"
            value={make}
            onChange={(value) => {
              setMake(value);
              setModel("all");
            }}
            options={makes}
          />
          <FilterSelect label="Model" value={model} onChange={setModel} options={models} />
          <FilterSelect
            label="Transmission"
            value={transmission}
            onChange={setTransmission}
            options={transmissions}
          />
          <FilterSelect label="Fuel type" value={fuel} onChange={setFuel} options={fuels} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min daily rate">
              <Input
                inputMode="decimal"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Max daily rate">
              <Input
                inputMode="decimal"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Any"
              />
            </Field>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {fleet.length} vehicles
        </p>
      </AdminPanel>

      {filtered.length === 0 ? (
        <AdminPanel className="py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-lg bg-accent">
            <Car className="size-6" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">
            {fleet.length === 0
              ? "No vehicles in the fleet yet"
              : "No vehicles match these filters"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {fleet.length === 0
              ? "Add the first vehicle to start tracking photos, rates and availability."
              : "Adjust the search or filters to see more of the fleet."}
          </p>
          {fleet.length === 0 && (
            <Button className="mt-5" variant="gold" onClick={() => openForm()}>
              <Plus /> Add vehicle
            </Button>
          )}
        </AdminPanel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vehicle) => {
            const duties = dutiesFor(vehicle.id, bookingRows, transferRows);
            const current = duties.find((duty) => duty.phase === "current") ?? duties[0];
            const modelLine = vehicleModelLine(vehicle);
            return (
              <article
                key={vehicle.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:shadow-gold"
              >
                <button
                  type="button"
                  className="relative block text-left"
                  onClick={() => setSelectedId(vehicle.id)}
                >
                  <VehiclePhoto
                    src={vehicle.images?.[0]}
                    alt={`${vehicle.name} photo`}
                    className="aspect-[16/10]"
                  />
                  <StatusBadge status={vehicle.status} className="absolute left-3 top-3" />
                </button>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setSelectedId(vehicle.id)}
                  >
                    <p className="font-mono text-xs font-bold tracking-wide text-muted-foreground">
                      {vehicle.registration || "No registration"}
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold leading-tight">
                      {vehicle.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[vehicle.category || "Vehicle", modelLine, vehicle.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[vehicle.transmission, vehicle.fuel_type].filter(Boolean).join(" · ") ||
                        "Transmission and fuel not set"}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Daily
                      </p>
                      <p className="font-semibold tabular-nums">{money(vehicle.daily_rate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Hourly
                      </p>
                      <p className="font-semibold tabular-nums">{money(vehicle.hourly_rate)}</p>
                    </div>
                  </div>
                  <p className="rounded-md bg-muted/60 px-3 py-2 text-xs">
                    <span className="font-semibold">Assignment · </span>
                    {current ? `${current.reference} · ${current.title}` : "Unassigned"}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openForm(vehicle)}>
                      <Pencil /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAssignId(vehicle.id);
                        setBookingId("");
                      }}
                    >
                      <UserRound /> Assign
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openMaintenance(vehicle.id)}>
                      <Wrench /> Service
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="goldOutline">
                          Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => changeHold(vehicle, null)}>
                          Mark available
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeHold(vehicle, "maintenance")}>
                          Mark for maintenance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeHold(vehicle, "unavailable")}>
                          Remove from service
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AdminPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Maintenance</h2>
            <p className="text-xs text-muted-foreground">
              Service history for the vehicles currently in view.
            </p>
          </div>
        </div>
        {visibleMaintenance.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No maintenance records for this view.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Vehicle</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Mileage</th>
                  <th className="px-2 py-2">Cost</th>
                  <th className="px-2 py-2">Next service</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Notes</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {visibleMaintenance.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-2 py-3 font-medium">
                      {row.vehicles?.name ?? "Vehicle"}
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {row.vehicles?.registration || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-3">{row.maintenance_type}</td>
                    <td className="px-2 py-3">{formatDay(row.serviced_on)}</td>
                    <td className="px-2 py-3 tabular-nums">
                      {row.mileage != null ? row.mileage.toLocaleString() : "—"}
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      {row.cost != null ? money(row.cost, row.currency) : "—"}
                    </td>
                    <td className="px-2 py-3">{formatDay(row.next_service_on)}</td>
                    <td className="px-2 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          maintenanceTone(row.status),
                        )}
                      >
                        {MAINTENANCE_STATUSES.find((item) => item.value === row.status)?.label ??
                          row.status}
                      </span>
                    </td>
                    <td className="max-w-48 truncate px-2 py-3 text-muted-foreground">
                      {row.notes || "—"}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openMaintenance(row.vehicle_id, row)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          const vehicle = fleet.find((item) => item.id === photoVehicleId);
          if (vehicle && files.length) {
            images.mutate({ id: vehicle.id, images: vehicle.images ?? [], files });
          }
          event.target.value = "";
        }}
      />

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          {selected && (
            <VehicleDetail
              key={selected.id}
              vehicle={selected}
              duties={dutiesFor(selected.id, bookingRows, transferRows)}
              history={maintenanceRows.filter((row) => row.vehicle_id === selected.id)}
              busy={images.isPending || setHold.isPending || releaseVehicle.isPending}
              onEdit={() => openForm(selected)}
              onAssign={() => {
                setAssignId(selected.id);
                setBookingId("");
              }}
              onMaintenance={() => openMaintenance(selected.id)}
              onEditMaintenance={(row) => openMaintenance(selected.id, row)}
              onHold={(hold) => changeHold(selected, hold)}
              onRelease={() => releaseVehicle.mutate({ id: selected.id, name: selected.name })}
              onUpload={() => {
                setPhotoVehicleId(selected.id);
                photoRef.current?.click();
              }}
              onRemoveImage={(url) =>
                images.mutate({ id: selected.id, images: selected.images ?? [], remove: url })
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formVehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
            <DialogDescription>
              Registration, specification and pricing are saved to the fleet record.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const input = inputFromForm(form);
              if (typeof input === "string") {
                toast.error(input);
                return;
              }
              const files = formFiles;
              saveVehicle.mutate(
                { id: formVehicle?.id, input },
                {
                  onSuccess: (id) => {
                    if (files.length)
                      images.mutate({ id, images: formVehicle?.images ?? [], files });
                    setFormOpen(false);
                  },
                },
              );
            }}
          >
            <Field label="Vehicle name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Registration">
              <Input
                value={form.registration}
                onChange={(event) => setForm({ ...form, registration: event.target.value })}
              />
            </Field>
            <Field label="Make">
              <Input
                value={form.make}
                onChange={(event) => setForm({ ...form, make: event.target.value })}
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
              />
            </Field>
            <Field label="Year">
              <Input
                inputMode="numeric"
                value={form.year}
                onChange={(event) => setForm({ ...form, year: event.target.value })}
              />
            </Field>
            <Field label="Vehicle type">
              <Input
                list="vehicle-types"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
              <datalist id="vehicle-types">
                {types.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
            <Field label="Mileage">
              <Input
                inputMode="numeric"
                value={form.mileage}
                onChange={(event) => setForm({ ...form, mileage: event.target.value })}
              />
            </Field>
            <Field label="Capacity">
              <Input
                inputMode="numeric"
                value={form.seats}
                onChange={(event) => setForm({ ...form, seats: event.target.value })}
              />
            </Field>
            <Field label="Fuel type">
              <Input
                list="fuel-types"
                value={form.fuel_type}
                onChange={(event) => setForm({ ...form, fuel_type: event.target.value })}
              />
              <datalist id="fuel-types">
                {fuels.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
            <Field label="Transmission">
              <Input
                list="transmissions"
                value={form.transmission}
                onChange={(event) => setForm({ ...form, transmission: event.target.value })}
              />
              <datalist id="transmissions">
                {transmissions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
            <Field label="Daily rate (ZMW)">
              <Input
                inputMode="decimal"
                value={form.daily_rate}
                onChange={(event) => setForm({ ...form, daily_rate: event.target.value })}
              />
            </Field>
            <Field label="Hourly rate (ZMW)">
              <Input
                inputMode="decimal"
                value={form.hourly_rate}
                onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })}
              />
            </Field>
            <Field label="Fuel policy">
              <Input
                value={form.fuel_policy}
                onChange={(event) => setForm({ ...form, fuel_policy: event.target.value })}
              />
            </Field>
            <Field label="Insurance">
              <Input
                value={form.insurance_info}
                onChange={(event) => setForm({ ...form, insurance_info: event.target.value })}
              />
            </Field>
            <label className="block space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Notes</span>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
            <label className="block space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Pictures</span>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setFormFiles([...(event.target.files ?? [])])}
              />
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" variant="gold" disabled={saveVehicle.isPending}>
                {saveVehicle.isPending && <Loader2 className="animate-spin" />}
                Save vehicle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assignTarget)} onOpenChange={(open) => !open && setAssignId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {assignTarget?.name}</DialogTitle>
            <DialogDescription>
              Link this vehicle to an open BKS booking. Its status follows that booking.
            </DialogDescription>
          </DialogHeader>
          {openBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              There are no open bookings.{" "}
              <Link to="/admin/bookings" className="font-semibold underline">
                Open bookings
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              <Label>Booking</Label>
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  {openBookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.reference} ·{" "}
                      {booking.profiles?.full_name || booking.title || "Booking"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="gold"
              disabled={!assignTarget || !bookingId || assignVehicle.isPending}
              onClick={() => {
                if (!assignTarget || !bookingId) return;
                const booking = openBookings.find((row) => row.id === bookingId);
                assignVehicle.mutate(
                  { vehicle: assignTarget, bookingId, reference: booking?.reference ?? "" },
                  { onSuccess: () => setAssignId(null) },
                );
              }}
            >
              {assignVehicle.isPending && <Loader2 className="animate-spin" />}
              Assign vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {maintenanceForm?.id ? "Update maintenance" : "Record maintenance"}
            </DialogTitle>
            <DialogDescription>
              Service date, mileage, cost and the next due date.
            </DialogDescription>
          </DialogHeader>
          {maintenanceForm && maintenanceVehicleId && (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!maintenanceForm.maintenance_type.trim() || !maintenanceForm.serviced_on)
                  return;
                const mileage = optionalInt(maintenanceForm.mileage);
                const cost = maintenanceForm.cost.trim() ? moneyAmount(maintenanceForm.cost) : null;
                const payload: MaintenanceInput = {
                  id: maintenanceForm.id,
                  vehicle_id: maintenanceVehicleId,
                  maintenance_type: maintenanceForm.maintenance_type.trim(),
                  serviced_on: maintenanceForm.serviced_on,
                  mileage,
                  cost,
                  next_service_on: blankToNull(maintenanceForm.next_service_on),
                  status: maintenanceForm.status,
                  notes: blankToNull(maintenanceForm.notes),
                  hold: maintenanceForm.hold === "none" ? null : maintenanceForm.hold,
                };
                saveMaintenance.mutate(payload, { onSuccess: () => setMaintenanceOpen(false) });
              }}
            >
              <Field label="Maintenance type">
                <Input
                  list="maintenance-types"
                  value={maintenanceForm.maintenance_type}
                  onChange={(event) =>
                    setMaintenanceForm({ ...maintenanceForm, maintenance_type: event.target.value })
                  }
                  required
                />
                <datalist id="maintenance-types">
                  {MAINTENANCE_TYPES.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Date">
                  <Input
                    type="date"
                    value={maintenanceForm.serviced_on}
                    onChange={(event) =>
                      setMaintenanceForm({ ...maintenanceForm, serviced_on: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Mileage">
                  <Input
                    inputMode="numeric"
                    value={maintenanceForm.mileage}
                    onChange={(event) =>
                      setMaintenanceForm({ ...maintenanceForm, mileage: event.target.value })
                    }
                  />
                </Field>
                <Field label="Cost (ZMW)">
                  <Input
                    inputMode="decimal"
                    value={maintenanceForm.cost}
                    onChange={(event) =>
                      setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })
                    }
                  />
                </Field>
                <Field label="Next service">
                  <Input
                    type="date"
                    value={maintenanceForm.next_service_on}
                    onChange={(event) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        next_service_on: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Status">
                <Select
                  value={maintenanceForm.status}
                  onValueChange={(value) =>
                    setMaintenanceForm({ ...maintenanceForm, status: value as MaintenanceStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_STATUSES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Notes</span>
                <Textarea
                  value={maintenanceForm.notes}
                  onChange={(event) =>
                    setMaintenanceForm({ ...maintenanceForm, notes: event.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={maintenanceForm.hold === "maintenance"}
                  onCheckedChange={(checked) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      hold:
                        checked === true
                          ? "maintenance"
                          : maintenanceForm.hold === "maintenance"
                            ? "none"
                            : maintenanceForm.hold,
                    })
                  }
                />
                Mark vehicle for maintenance
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={maintenanceForm.hold === "available"}
                  onCheckedChange={(checked) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      hold:
                        checked === true
                          ? "available"
                          : maintenanceForm.hold === "available"
                            ? "none"
                            : maintenanceForm.hold,
                    })
                  }
                />
                Return vehicle to service
              </label>
              <DialogFooter>
                <Button type="submit" variant="gold" disabled={saveMaintenance.isPending}>
                  {saveMaintenance.isPending && <Loader2 className="animate-spin" />}
                  Save maintenance
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels?.[option] ?? option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function VehicleDetail({
  vehicle,
  duties,
  history,
  busy,
  onEdit,
  onAssign,
  onMaintenance,
  onEditMaintenance,
  onHold,
  onRelease,
  onUpload,
  onRemoveImage,
}: {
  vehicle: FleetVehicle;
  duties: Duty[];
  history: MaintenanceRow[];
  busy: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onMaintenance: () => void;
  onEditMaintenance: (row: MaintenanceRow) => void;
  onHold: (hold: "maintenance" | "unavailable" | null) => void;
  onRelease: () => void;
  onUpload: () => void;
  onRemoveImage: (url: string) => void;
}) {
  const [active, setActive] = useState(0);
  const photos = vehicle.images ?? [];
  const photo = photos[active] ?? photos[0];
  const current = duties.filter((duty) => duty.phase === "current");
  const upcoming = duties.filter((duty) => duty.phase === "upcoming");
  const modelLine = vehicleModelLine(vehicle);

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="pr-8">{vehicle.name}</DialogTitle>
        <DialogDescription>
          {vehicle.registration || "No registration"}
          {modelLine ? ` · ${modelLine}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <VehiclePhoto
            src={photo}
            alt={`${vehicle.name} photo`}
            className="aspect-[16/9] rounded-lg"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {photos.map((url, index) => (
              <div key={url} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    "overflow-hidden rounded-md border-2",
                    index === active ? "border-primary" : "border-transparent",
                  )}
                >
                  <VehiclePhoto src={url} alt="" className="size-16" />
                </button>
                <button
                  type="button"
                  className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-ink-foreground"
                  aria-label="Remove picture"
                  onClick={() => onRemoveImage(url)}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-16 shrink-0 rounded-md"
              onClick={onUpload}
              disabled={busy}
            >
              <ImagePlus />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <StatusBadge status={vehicle.status} />
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Spec label="Registration" value={vehicle.registration || "—"} />
            <Spec label="Make / model" value={modelLine || vehicle.name} />
            <Spec label="Year" value={vehicle.year ? String(vehicle.year) : "—"} />
            <Spec label="Type" value={vehicle.category || "—"} />
            <Spec
              label="Mileage"
              value={vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} km` : "—"}
            />
            <Spec label="Fuel" value={vehicle.fuel_type || vehicle.fuel_policy || "—"} />
            <Spec label="Transmission" value={vehicle.transmission || "—"} />
            <Spec label="Capacity" value={`${vehicle.seats} seats`} />
            <Spec label="Daily rate" value={money(vehicle.daily_rate)} />
            <Spec label="Hourly rate" value={money(vehicle.hourly_rate)} />
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onAssign}>
          <UserRound /> Assign
        </Button>
        <Button size="sm" variant="outline" onClick={onRelease} disabled={busy}>
          <Gauge /> Release
        </Button>
        <Button size="sm" variant="outline" onClick={onMaintenance}>
          <Wrench /> Maintenance
        </Button>
        <Button size="sm" variant="goldOutline" onClick={() => onHold(null)}>
          Available
        </Button>
        <Button size="sm" variant="goldOutline" onClick={() => onHold("maintenance")}>
          Maintenance
        </Button>
        <Button size="sm" variant="goldOutline" onClick={() => onHold("unavailable")}>
          Remove from service
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Open bookings move a vehicle through Reserved, Assigned and In Use. Maintenance and
        out-of-service holds stay in place until cleared.
      </p>

      <Tabs defaultValue="bookings">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance history</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings" className="space-y-4">
          <DutyList
            title="Current booking / assignment"
            duties={current}
            empty="No current assignment."
          />
          <DutyList title="Upcoming bookings" duties={upcoming} empty="No upcoming bookings." />
          <Button asChild variant="link" className="px-0">
            <Link to="/admin/bookings">View vehicle bookings</Link>
          </Button>
        </TabsContent>
        <TabsContent value="maintenance" className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No maintenance history yet.</p>
          ) : (
            history.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onEditMaintenance(row)}
                className="flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-semibold">{row.maintenance_type}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatDay(row.serviced_on)}
                    {row.mileage != null ? ` · ${row.mileage.toLocaleString()} km` : ""}
                    {row.cost != null ? ` · ${money(row.cost, row.currency)}` : ""}
                    {row.next_service_on ? ` · Next ${formatDay(row.next_service_on)}` : ""}
                  </span>
                  {row.notes && (
                    <span className="mt-1 block text-xs text-muted-foreground">{row.notes}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    maintenanceTone(row.status),
                  )}
                >
                  {MAINTENANCE_STATUSES.find((item) => item.value === row.status)?.label ??
                    row.status}
                </span>
              </button>
            ))
          )}
        </TabsContent>
        <TabsContent value="notes">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {vehicle.notes || "No notes on this vehicle."}
          </p>
          {vehicle.insurance_info && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Insurance · </span>
              {vehicle.insurance_info}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function DutyList({ title, duties, empty }: { title: string; duties: Duty[]; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {duties.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {duties.map((duty) => (
            <li key={duty.key} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-semibold">
                {duty.reference} · {duty.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {duty.customer} · {duty.when}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
