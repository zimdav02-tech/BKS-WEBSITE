import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MapPin,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { AdminPanel, AdminSkeleton } from "@/components/admin/AdminUI";
import { money } from "@/components/portal/status";
import { useMyRoles } from "@/hooks/useAdmin";
import {
  removeApartmentImage,
  uploadApartmentImage,
  useAdminApartments,
  useAdminBookings,
  useAdminRealtime,
  useSaveApartment,
  type AdminBooking,
  type ApartmentInput,
} from "@/hooks/useAdminData";
import { useProfile } from "@/hooks/usePortal";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  availabilityOnDay,
  currentAvailability,
  staysFromBookings,
  todayKey,
  type ApartmentAvailability,
  type StayWindow,
} from "@/lib/apartment-availability";
import { logAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";

type Apartment = Tables<"apartments">;

const STATUS_ORDER: ApartmentAvailability[] = [
  "available",
  "reserved",
  "occupied",
  "maintenance",
  "unavailable",
];

const STATUS_LABEL: Record<ApartmentAvailability, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  maintenance: "Maintenance",
  unavailable: "Unavailable",
};

const STATUS_CLASS: Record<ApartmentAvailability, string> = {
  available: "bg-emerald-500/15 text-emerald-800 border-emerald-500/40",
  reserved: "bg-amber-500/15 text-amber-800 border-amber-500/40",
  occupied: "bg-primary/20 text-foreground border-primary/50",
  maintenance: "bg-muted text-muted-foreground border-border",
  unavailable: "bg-destructive/10 text-destructive border-destructive/30",
};

function StatusBadge({ status }: { status: ApartmentAvailability }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        STATUS_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function blankInput(): ApartmentInput {
  return {
    name: "",
    unit_type: "",
    address: "",
    city: "",
    description: "",
    bedrooms: 1,
    nightly_rate: 0,
    amenities: [],
    house_rules: "",
    map_url: "",
    is_active: true,
    hold_reason: null,
    images: [],
  };
}

function inputFrom(apartment: Apartment): ApartmentInput {
  return {
    name: apartment.name,
    unit_type: apartment.unit_type ?? "",
    address: apartment.address ?? "",
    city: apartment.city ?? "",
    description: apartment.description ?? "",
    bedrooms: apartment.bedrooms,
    nightly_rate: Number(apartment.nightly_rate ?? 0),
    amenities: apartment.amenities ?? [],
    house_rules: apartment.house_rules ?? "",
    map_url: apartment.map_url ?? "",
    is_active: apartment.is_active,
    hold_reason: apartment.hold_reason,
    images: apartment.images ?? [],
  };
}

function cleanInput(values: ApartmentInput): ApartmentInput {
  return {
    ...values,
    name: values.name.trim(),
    unit_type: values.unit_type?.trim() || null,
    address: values.address?.trim() || null,
    city: values.city?.trim() || null,
    description: values.description?.trim() || null,
    house_rules: values.house_rules?.trim() || null,
    map_url: values.map_url?.trim() || null,
    amenities: values.amenities.map((item) => item.trim()).filter(Boolean),
    bedrooms: Math.max(0, Number(values.bedrooms) || 0),
    nightly_rate: Math.max(0, Number(values.nightly_rate) || 0),
  };
}

export function ApartmentsDashboard() {
  const live = useAdminRealtime();
  const { isSuperAdmin, roles } = useMyRoles();
  const { data: profile } = useProfile();
  const apartments = useAdminApartments();
  const bookings = useAdminBookings();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [unitType, setUnitType] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [amenity, setAmenity] = useState("all");
  const [availability, setAvailability] = useState<"all" | ApartmentAvailability>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Apartment | "new" | null>(null);
  const [cursor, setCursor] = useState(() => {
    const today = todayKey();
    const [year, month] = today.split("-").map(Number);
    return { year, month: month - 1 };
  });
  const [focusDay, setFocusDay] = useState<string | null>(null);

  const rows = useMemo(() => apartments.data ?? [], [apartments.data]);
  const stays = useMemo(() => staysFromBookings(bookings.data ?? []), [bookings.data]);
  const today = todayKey();
  const statusOf = (apartment: Apartment) => currentAvailability(apartment, stays, today);

  const locations = useMemo(
    () => [...new Set(rows.map((row) => row.city).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const types = useMemo(
    () => [...new Set(rows.map((row) => row.unit_type).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const amenities = useMemo(
    () =>
      [...new Set(rows.flatMap((row) => row.amenities ?? []))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const counts = useMemo(() => {
    const tally = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<
      ApartmentAvailability,
      number
    >;
    for (const row of rows) tally[currentAvailability(row, stays, today)] += 1;
    return tally;
  }, [rows, stays, today]);

  const filtered = rows.filter((row) => {
    const status = statusOf(row);
    if (availability !== "all" && status !== availability) return false;
    if (location !== "all" && row.city !== location) return false;
    if (unitType !== "all" && row.unit_type !== unitType) return false;
    if (bedrooms === "4" && row.bedrooms < 4) return false;
    if (bedrooms !== "all" && bedrooms !== "4" && row.bedrooms !== Number(bedrooms)) return false;
    if (
      amenity !== "all" &&
      !(row.amenities ?? []).some((item) => item.toLowerCase() === amenity.toLowerCase())
    )
      return false;
    const rate = Number(row.nightly_rate ?? 0);
    if (minPrice && rate < Number(minPrice)) return false;
    if (maxPrice && rate > Number(maxPrice)) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [row.name, row.city, row.address, row.unit_type, ...(row.amenities ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const roleLabel = isSuperAdmin
    ? "Super Administrator"
    : (roles?.[0] ?? "staff").replaceAll("_", " ");
  const initials = (profile?.full_name || profile?.email || "BKS")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (apartments.isLoading && !rows.length) return <AdminSkeleton />;

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-gradient-ink text-ink-foreground shadow-soft">
        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              Property inventory
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              Apartments Dashboard
            </h1>
            <p className="mt-1 text-sm text-ink-foreground/70">
              Pictures, rates and live availability for every BKS apartment.
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
            <Button size="sm" onClick={() => setEditor("new")}>
              <Plus /> Add apartment
            </Button>
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

      {apartments.isError && (
        <AdminPanel>
          <p className="text-sm text-destructive">
            Apartments could not be loaded. {apartments.error.message}
          </p>
        </AdminPanel>
      )}

      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={availability === status}
            onClick={() => setAvailability(availability === status ? "all" : status)}
            className={cn(
              "rounded-lg border bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary",
              availability === status ? "border-primary shadow-gold" : "border-border",
            )}
          >
            <StatusBadge status={status} />
            <p className="mt-3 font-display text-2xl font-bold">{counts[status]}</p>
          </button>
        ))}
      </div>

      <AdminPanel className="min-w-0">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search apartment, location or amenity"
              aria-label="Search apartments"
            />
          </label>
          <FilterSelect
            label="Location"
            value={location}
            onChange={setLocation}
            options={locations}
            allLabel="All locations"
          />
          <FilterSelect
            label="Apartment type"
            value={unitType}
            onChange={setUnitType}
            options={types}
            allLabel="All types"
          />
          <label className="block text-xs font-semibold text-muted-foreground">
            Bedrooms
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
              value={bedrooms}
              onChange={(event) => setBedrooms(event.target.value)}
              aria-label="Filter by bedrooms"
            >
              <option value="all">Any bedrooms</option>
              <option value="1">1 bedroom</option>
              <option value="2">2 bedrooms</option>
              <option value="3">3 bedrooms</option>
              <option value="4">4+ bedrooms</option>
            </select>
          </label>
          <FilterSelect
            label="Amenities"
            value={amenity}
            onChange={setAmenity}
            options={amenities}
            allLabel="All amenities"
          />
          <Input
            type="number"
            min={0}
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="Min nightly rate"
            aria-label="Minimum price"
          />
          <Input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Max nightly rate"
            aria-label="Maximum price"
          />
        </div>
      </AdminPanel>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <AdminPanel>
              <p className="py-10 text-center text-sm text-muted-foreground">
                {rows.length === 0
                  ? "No apartments yet. Add one to start the gallery. Availability will follow bookings automatically."
                  : "No apartments match these filters."}
              </p>
            </AdminPanel>
          ) : (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {filtered.map((apartment) => (
                <ApartmentCard
                  key={apartment.id}
                  apartment={apartment}
                  status={statusOf(apartment)}
                  onOpen={() => setSelectedId(apartment.id)}
                  onEdit={() => setEditor(apartment)}
                />
              ))}
            </div>
          )}
        </div>
        <AvailabilityCalendar
          cursor={cursor}
          onCursor={setCursor}
          apartments={availability === "all" ? rows : filtered}
          stays={stays}
          today={today}
          focusDay={focusDay}
          onFocusDay={setFocusDay}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto">
          {selected && (
            <ApartmentDetail
              apartment={selected}
              status={statusOf(selected)}
              stays={stays.filter((stay) => stay.apartmentId === selected.id)}
              bookings={bookings.data ?? []}
              today={today}
              onEdit={() => {
                setSelectedId(null);
                setEditor(selected);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto">
          {editor && (
            <ApartmentForm
              apartment={editor === "new" ? null : editor}
              onClose={() => setEditor(null)}
            />
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
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <select
        className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ApartmentCard({
  apartment,
  status,
  onOpen,
  onEdit,
}: {
  apartment: Apartment;
  status: ApartmentAvailability;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const image = apartment.images?.[0];
  const save = useSaveApartment();
  const place =
    [apartment.city, apartment.address].filter(Boolean).join(" · ") || "Location not set";
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-[4/3] w-full bg-ink text-left"
      >
        {image ? (
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-ink-foreground/40">
            <Building2 className="size-10" />
          </span>
        )}
        <span className="absolute left-3 top-3">
          <StatusBadge status={status} />
        </span>
        {(apartment.images?.length ?? 0) > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            {apartment.images.length} photos
          </span>
        )}
      </button>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold">{apartment.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{place}</span>
            </p>
          </div>
          <p className="shrink-0 text-right text-sm font-bold">{money(apartment.nightly_rate)}</p>
        </div>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{apartment.unit_type || "Type not set"}</span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="size-3" />
            {apartment.bedrooms} bed{apartment.bedrooms === 1 ? "" : "s"}
          </span>
        </p>
        <div className="flex flex-wrap gap-1">
          {(apartment.amenities ?? []).slice(0, 4).map((item) => (
            <span
              key={item}
              className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground"
            >
              {item}
            </span>
          ))}
          {(apartment.amenities?.length ?? 0) > 4 && (
            <span className="text-[10px] text-muted-foreground">
              +{apartment.amenities.length - 4}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onOpen}>
            View
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                id: apartment.id,
                values: cleanInput({
                  ...inputFrom(apartment),
                  is_active: status === "maintenance" ? true : false,
                  hold_reason: status === "maintenance" ? null : "maintenance",
                }),
              })
            }
          >
            <Wrench />
            {status === "maintenance" ? "Clear maintenance" : "Maintenance"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function AvailabilityCalendar({
  cursor,
  onCursor,
  apartments,
  stays,
  today,
  focusDay,
  onFocusDay,
}: {
  cursor: { year: number; month: number };
  onCursor: (next: { year: number; month: number }) => void;
  apartments: Apartment[];
  stays: StayWindow[];
  today: string;
  focusDay: string | null;
  onFocusDay: (day: string) => void;
}) {
  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
  const days = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  const shift = (delta: number) => {
    const date = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    onCursor({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  };
  const daySummary = (day: number) => {
    const key = dateKey(cursor.year, cursor.month, day);
    const statuses = apartments.map((apartment) => availabilityOnDay(apartment, key, stays, today));
    return { key, statuses };
  };

  return (
    <AdminPanel className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Availability
        </p>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <p className="min-w-28 text-center text-sm font-semibold">
            {monthLabel(cursor.year, cursor.month)}
          </p>
          <Button size="sm" variant="outline" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const summary = daySummary(day);
          const blocked = summary.statuses.filter((status) => status !== "available").length;
          const active = focusDay === summary.key;
          return (
            <button
              key={summary.key}
              type="button"
              onClick={() => onFocusDay(summary.key)}
              className={cn(
                "rounded-md border px-1 py-2 text-xs",
                summary.key === today && "border-primary",
                active ? "bg-accent" : "border-transparent hover:bg-muted",
              )}
            >
              <span className="font-semibold">{day}</span>
              <span className="mt-1 block text-[9px] text-muted-foreground">
                {blocked ? `${blocked} held` : "Open"}
              </span>
            </button>
          );
        })}
      </div>
      <DayList day={focusDay} apartments={apartments} stays={stays} today={today} />
    </AdminPanel>
  );
}

function DayList({
  day,
  apartments,
  stays,
  today,
}: {
  day: string | null;
  apartments: Apartment[];
  stays: StayWindow[];
  today: string;
}) {
  if (!day)
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Select a date to see which apartments are free.
      </p>
    );
  const rows = apartments.map((apartment) => ({
    apartment,
    status: availabilityOnDay(apartment, day, stays, today),
  }));
  return (
    <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
      {rows.map(({ apartment, status }) => (
        <li key={apartment.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{apartment.name}</span>
          <StatusBadge status={status} />
        </li>
      ))}
    </ul>
  );
}

function ApartmentDetail({
  apartment,
  status,
  stays,
  bookings,
  today,
  onEdit,
}: {
  apartment: Apartment;
  status: ApartmentAvailability;
  stays: StayWindow[];
  bookings: AdminBooking[];
  today: string;
  onEdit: () => void;
}) {
  const images = apartment.images ?? [];
  const [photo, setPhoto] = useState(0);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const save = useSaveApartment();
  const noteMutation = useMutation({
    mutationFn: async (text: string) => {
      await logAudit({
        action: "apartment.note",
        entityType: "apartments",
        entityId: apartment.id,
        details: { name: apartment.name, note: text },
      });
    },
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Could not save note", { description: error.message }),
  });
  const history = useQuery({
    queryKey: ["admin", "apartment-notes", apartment.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", "apartments")
        .eq("entity_id", apartment.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => setPhoto(0), [apartment.id]);

  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const current = stays.filter((stay) => stay.start <= today && stay.end >= today);
  const upcoming = stays
    .filter((stay) => stay.start > today)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  const notes = (history.data ?? []).filter((row) => row.action === "apartment.note");

  const setHold = (next: "available" | "maintenance" | "unavailable") => {
    save.mutate({
      id: apartment.id,
      values: {
        ...inputFrom(apartment),
        is_active: next === "available",
        hold_reason: next === "available" ? null : next,
      },
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display pr-6">{apartment.name}</DialogTitle>
        <DialogDescription>
          {[apartment.unit_type, apartment.city, apartment.address].filter(Boolean).join(" · ") ||
            "Apartment details"}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink">
            {images[photo] ? (
              <img src={images[photo]} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-ink-foreground/40">
                <Building2 className="size-10" />
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute inset-x-3 bottom-3 flex justify-between">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => setPhoto((index) => (index - 1 + images.length) % images.length)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => setPhoto((index) => (index + 1) % images.length)}
                  aria-label="Next photo"
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPhoto(index)}
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-md border",
                    photo === index && "border-primary",
                  )}
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span>{apartment.bedrooms} bedrooms</span>
          </div>
          <p className="font-display text-xl font-bold">
            {money(apartment.nightly_rate)}{" "}
            <span className="text-sm font-medium text-muted-foreground">/ night</span>
          </p>
          <p>{apartment.description || "No description yet."}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Amenities
          </p>
          <div className="flex flex-wrap gap-1">
            {(apartment.amenities ?? []).length === 0 ? (
              <span>No amenities listed.</span>
            ) : (
              apartment.amenities.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold"
                >
                  {item}
                </span>
              ))
            )}
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            House rules
          </p>
          <p>{apartment.house_rules || "No house rules recorded."}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={save.isPending}
              onClick={() => setHold("available")}
            >
              Available
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={save.isPending}
              onClick={() => setHold("maintenance")}
            >
              Maintenance
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={save.isPending}
              onClick={() => setHold("unavailable")}
            >
              Unavailable
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Reserved and occupied follow booking dates. Maintenance and unavailable keep the
            apartment off sale.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBlock title="Current booking">
          <StayList stays={current} bookingById={bookingById} empty="No stay covering today." />
        </InfoBlock>
        <InfoBlock title="Upcoming bookings">
          <StayList stays={upcoming} bookingById={bookingById} empty="No upcoming bookings." />
        </InfoBlock>
      </div>
      <InfoBlock title="Notes">
        {notes.length === 0 ? (
          <p>No internal notes.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((row) => (
              <li key={row.id}>
                <p>{noteText(row.details)}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {row.created_at.slice(0, 16).replace("T", " ")}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          className="mt-3"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Internal note"
          aria-label="Internal note"
        />
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          disabled={!note.trim() || noteMutation.isPending}
          onClick={() => noteMutation.mutate(note.trim())}
        >
          Add note
        </Button>
      </InfoBlock>
    </>
  );
}

function StayList({
  stays,
  bookingById,
  empty,
}: {
  stays: StayWindow[];
  bookingById: Map<string, AdminBooking>;
  empty: string;
}) {
  if (!stays.length) return <p>{empty}</p>;
  return (
    <ul className="space-y-3">
      {stays.map((stay) => {
        const booking = bookingById.get(stay.bookingId);
        return (
          <li key={`${stay.bookingId}-${stay.start}`}>
            <p className="font-semibold">
              {booking?.reference ?? "Booking"} · {stay.status.replaceAll("_", " ")}
            </p>
            <p>
              {stay.start} → {stay.end}
            </p>
            <p className="text-muted-foreground">
              {booking?.profiles?.full_name || booking?.profiles?.email || "Customer"}
              {booking?.profiles?.phone ? ` · ${booking.profiles.phone}` : ""}
              {booking?.profiles?.email ? ` · ${booking.profiles.email}` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function noteText(details: Tables<"audit_logs">["details"]) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const note = (details as { note?: unknown }).note;
  return typeof note === "string" ? note : "";
}

function ApartmentForm({
  apartment,
  onClose,
}: {
  apartment: Apartment | null;
  onClose: () => void;
}) {
  const save = useSaveApartment();
  const [values, setValues] = useState<ApartmentInput>(() =>
    apartment ? inputFrom(apartment) : blankInput(),
  );
  const [amenityText, setAmenityText] = useState(() => (apartment?.amenities ?? []).join(", "));
  const [files, setFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    setValues(apartment ? inputFrom(apartment) : blankInput());
    setAmenityText((apartment?.amenities ?? []).join(", "));
    setFiles([]);
  }, [apartment]);

  const set = <K extends keyof ApartmentInput>(key: K, value: ApartmentInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const onSubmit = async () => {
    const payload = cleanInput({
      ...values,
      amenities: amenityText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (!payload.name) {
      toast.error("Apartment name is required");
      return;
    }
    const id = await save.mutateAsync({ id: apartment?.id, values: payload });
    if (files.length) {
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadApartmentImage(id, file));
      const { error } = await supabase
        .from("apartments")
        .update({ images: [...(payload.images ?? []), ...uploaded] } as never)
        .eq("id", id);
      if (error) throw error;
      void queryClient.invalidateQueries();
    }
    onClose();
  };

  const dropImage = async (url: string) => {
    if (!apartment) return;
    await removeApartmentImage(url);
    const images = (values.images ?? []).filter((item) => item !== url);
    set("images", images);
    await save.mutateAsync({
      id: apartment.id,
      values: cleanInput({ ...values, amenities: amenityText.split(","), images }),
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {apartment ? "Edit apartment" : "Add apartment"}
        </DialogTitle>
        <DialogDescription>
          Pricing, amenities and pictures are saved to the apartment record.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name / number">
          <Input
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            aria-label="Apartment name"
          />
        </Field>
        <Field label="Apartment type">
          <Input
            value={values.unit_type ?? ""}
            onChange={(event) => set("unit_type", event.target.value)}
            aria-label="Apartment type"
          />
        </Field>
        <Field label="City">
          <Input
            value={values.city ?? ""}
            onChange={(event) => set("city", event.target.value)}
            aria-label="City"
          />
        </Field>
        <Field label="Address">
          <Input
            value={values.address ?? ""}
            onChange={(event) => set("address", event.target.value)}
            aria-label="Address"
          />
        </Field>
        <Field label="Bedrooms">
          <Input
            type="number"
            min={0}
            value={values.bedrooms}
            onChange={(event) => set("bedrooms", Number(event.target.value))}
            aria-label="Bedrooms"
          />
        </Field>
        <Field label="Nightly rate (ZMW)">
          <Input
            type="number"
            min={0}
            value={values.nightly_rate}
            onChange={(event) => set("nightly_rate", Number(event.target.value))}
            aria-label="Nightly rate"
          />
        </Field>
      </div>
      <Field label="Amenities, separated by commas">
        <Input
          value={amenityText}
          onChange={(event) => setAmenityText(event.target.value)}
          aria-label="Amenities"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={values.description ?? ""}
          onChange={(event) => set("description", event.target.value)}
          aria-label="Description"
        />
      </Field>
      <Field label="House rules">
        <Textarea
          value={values.house_rules ?? ""}
          onChange={(event) => set("house_rules", event.target.value)}
          aria-label="House rules"
        />
      </Field>
      <Field label="Map link">
        <Input
          value={values.map_url ?? ""}
          onChange={(event) => set("map_url", event.target.value)}
          aria-label="Map link"
        />
      </Field>
      <Field label="Pictures">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <ImagePlus className="size-4" />
          Upload pictures
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => setFiles([...(event.target.files ?? [])])}
          />
        </label>
        {files.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {files.length} new picture{files.length === 1 ? "" : "s"} ready to upload
          </p>
        )}
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {(values.images ?? []).map((src) => (
            <div key={src} className="relative size-20 shrink-0">
              <img src={src} alt="" className="size-full rounded-md object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white"
                onClick={() => void dropImage(src)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={save.isPending}
          onClick={() =>
            void onSubmit().catch((error: Error) =>
              toast.error("Upload failed", { description: error.message }),
            )
          }
        >
          Save apartment
        </Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <div className="mt-1 text-foreground">{children}</div>
    </label>
  );
}
