import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import { supabase } from "@/integrations/supabase/client";
import { todayKey, type ApartmentAvailability } from "@/lib/apartment-availability";
import { money } from "@/components/portal/status";

const LABELS: Record<ApartmentAvailability, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  maintenance: "Maintenance",
  unavailable: "Unavailable",
};

function fallbackStatus(apartment: {
  is_active: boolean;
  hold_reason?: string | null;
}): ApartmentAvailability {
  if (apartment.is_active) return "available";
  return apartment.hold_reason === "unavailable" ? "unavailable" : "maintenance";
}

/** Live catalogue on the furnished-apartments page. Renders nothing until real apartments exist. */
export function LiveApartments() {
  useRealtimeInvalidate("public-apartments", ["apartments"]);
  const query = useQuery({
    queryKey: ["public", "apartments"],
    queryFn: async () => {
      const today = todayKey();
      const { data, error } = await supabase.from("apartments").select("*").order("name");
      if (error) throw error;
      const rows = data ?? [];
      const status = await supabase.rpc("apartment_day_status", { on_date: today });
      const map = new Map(
        (status.data ?? []).map((row) => [row.apartment_id, row.status as ApartmentAvailability]),
      );
      return rows.map((apartment) => ({
        ...apartment,
        availability: map.get(apartment.id) ?? fallbackStatus(apartment),
      }));
    },
  });

  const rows = query.data ?? [];
  if (!rows.length) return null;

  return (
    <section className="container-bks pb-20">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Live availability
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold">Apartments ready to book</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((apartment) => {
          const image = apartment.images?.[0];
          return (
            <article
              key={apartment.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-soft"
            >
              <div className="relative aspect-[4/3] bg-ink">
                {image ? (
                  <img src={image} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-ink-foreground/40">
                    <Building2 className="size-8" />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">
                  {LABELS[apartment.availability]}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg font-bold">{apartment.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[apartment.unit_type, apartment.city, apartment.address]
                    .filter(Boolean)
                    .join(" · ") || "Location to be confirmed"}
                </p>
                <p className="mt-3 text-sm font-semibold">
                  {apartment.bedrooms} bedroom{apartment.bedrooms === 1 ? "" : "s"} ·{" "}
                  {money(apartment.nightly_rate)} / night
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
