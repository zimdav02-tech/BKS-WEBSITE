import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Ban, Building2, CalendarDays, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeading, AdminPanel, StatusDot } from "@/components/admin/AdminUI";
import { useAdminApartments, useAdminRealtime } from "@/hooks/useAdminData";
import {
  useApartmentBlackouts,
  useApartmentBusyRanges,
  useCreateBlackout,
  useDeleteBlackout,
  type BusyRange,
} from "@/hooks/useAvailability";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

function expandRange(range: BusyRange) {
  const days: Date[] = [];
  const start = new Date(range.start_at);
  const end = new Date(range.end_at);
  for (let t = start.getTime(); t < end.getTime(); t += DAY) {
    const d = new Date(t);
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return days;
}

export function ApartmentAvailability() {
  useAdminRealtime();
  const apartments = useAdminApartments();
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? apartments.data?.[0]?.id ?? null;

  const busy = useApartmentBusyRanges(activeId);
  const blackouts = useApartmentBlackouts(activeId);
  const createBlackout = useCreateBlackout();
  const deleteBlackout = useDeleteBlackout();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setFrom("");
    setTo("");
    setReason("");
  }, [activeId]);

  const { bookedDays, blockedDays } = useMemo(() => {
    const rows = busy.data ?? [];
    return {
      bookedDays: rows.filter((r) => r.source === "booking").flatMap(expandRange),
      blockedDays: rows.filter((r) => r.source === "blackout").flatMap(expandRange),
    };
  }, [busy.data]);

  const activeApartment = (apartments.data ?? []).find((a) => a.id === activeId);
  const canSubmit = Boolean(activeId && from && to && to > from) && !createBlackout.isPending;

  return (
    <div className="space-y-7">
      <AdminPageHeading
        eyebrow="Operations"
        title="Apartment availability"
        description="See every booked and blocked night per apartment, and reserve dates for maintenance or owner stays. Overlapping bookings are rejected automatically."
      />

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <AdminPanel className="p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Apartments
          </p>
          {apartments.isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (apartments.data ?? []).length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No apartments listed yet.</p>
          ) : (
            <ul className="space-y-1">
              {(apartments.data ?? []).map((apartment) => (
                <li key={apartment.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(apartment.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                      apartment.id === activeId
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      {apartment.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {apartment.city ?? "—"} · {apartment.bedrooms} bed
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">
                  {activeApartment?.name ?? "Select an apartment"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {bookedDays.length} booked nights · {blockedDays.length} blocked nights
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot label="Booked" tone="success" />
                <StatusDot label="Blocked" tone="danger" />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              {busy.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <Calendar
                  mode="single"
                  numberOfMonths={2}
                  modifiers={{ booked: bookedDays, blocked: blockedDays }}
                  modifiersClassNames={{
                    booked: "bg-primary/25 font-semibold rounded-md",
                    blocked: "bg-destructive/20 text-destructive font-semibold rounded-md",
                  }}
                  className="mx-auto"
                />
              )}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h3 className="flex items-center gap-2 font-display text-base font-bold">
              <Ban className="size-4 text-destructive" /> Block dates
            </h3>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                if (!activeId || !canSubmit) return;
                createBlackout.mutate(
                  { apartmentId: activeId, startDate: from, endDate: to, reason: reason || null },
                  {
                    onSuccess: () => {
                      setFrom("");
                      setTo("");
                      setReason("");
                    },
                  },
                );
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="blackout-from">From</Label>
                <Input
                  id="blackout-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blackout-to">To</Label>
                <Input
                  id="blackout-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blackout-reason">Reason</Label>
                <Input
                  id="blackout-reason"
                  placeholder="Maintenance, owner stay…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button type="submit" variant="gold" disabled={!canSubmit}>
                {createBlackout.isPending ? <Loader2 className="animate-spin" /> : <CalendarDays />}
                Block
              </Button>
            </form>

            <div className="mt-5 space-y-2">
              {blackouts.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (blackouts.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No blocked periods for this apartment.</p>
              ) : (
                (blackouts.data ?? []).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {format(new Date(row.start_date), "d MMM yyyy")} —{" "}
                        {format(new Date(row.end_date), "d MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.reason ?? "No reason given"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteBlackout.mutate({ id: row.id, apartmentId: row.apartment_id })
                      }
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Release dates</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
