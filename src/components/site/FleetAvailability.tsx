import { Car } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { usePublicFleet } from "@/hooks/useFleet";
import { money } from "@/components/portal/status";
import { publicAvailability, vehicleModelLine } from "@/lib/fleet";
import { cn } from "@/lib/utils";

function Photo({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="grid aspect-[16/10] place-items-center bg-gradient-ink text-gold">
        <Car className="size-8" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[16/10] w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/** Live catalogue on the public car-hire page. Hidden holds stay off the page. */
export function FleetAvailability() {
  const fleet = usePublicFleet();
  const listed = fleet.data ?? [];
  const rows = listed.filter(
    (vehicle) => vehicle.status !== "maintenance" && vehicle.status !== "unavailable",
  );
  const available = rows.filter((vehicle) => vehicle.status === "available").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Live fleet
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">Vehicles available to book</h2>
        </div>
        {!fleet.isLoading && !fleet.isError && (
          <p className="text-sm text-muted-foreground">{available} available now</p>
        )}
      </div>

      {fleet.isError ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Availability will appear here once the fleet is online.
        </p>
      ) : fleet.isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : listed.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No vehicles are listed yet. Cars appear here as they are added to the BKS fleet.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Every listed vehicle is in maintenance or out of service. Send a request and the team will
          confirm the next opening.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((vehicle) => {
            const availability = publicAvailability(vehicle.status);
            const model = vehicleModelLine(vehicle);
            return (
              <article
                key={vehicle.id}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
              >
                <div className="relative">
                  <Photo src={vehicle.images?.[0]} alt={`${vehicle.name} photo`} />
                  <span
                    className={cn(
                      "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      availability.bookable ? "bg-emerald-600 text-white" : "bg-ink text-gold",
                    )}
                  >
                    {availability.label}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <p className="font-mono text-xs font-bold text-muted-foreground">
                    {vehicle.registration || "Registration on request"}
                  </p>
                  <h3 className="font-display text-lg font-bold">{vehicle.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {[
                      vehicle.category,
                      model,
                      vehicle.year,
                      vehicle.transmission,
                      vehicle.fuel_type,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Executive fleet"}
                  </p>
                  <p className="text-sm font-semibold">{money(vehicle.daily_rate)} / day</p>
                  {Number(vehicle.hourly_rate) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {money(vehicle.hourly_rate)} / hour
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Button asChild variant="gold" className="mt-6">
        <Link to="/auth">Request this fleet</Link>
      </Button>
    </div>
  );
}
