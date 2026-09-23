import { createFileRoute } from "@tanstack/react-router";
import { Building2, Car, MapPin, PlaneLanding, Route as RouteIcon, Truck } from "lucide-react";
import {
  CardSkeletonGrid,
  EmptyState,
  ErrorState,
  PageHeading,
  PanelCard,
  StageTimeline,
} from "@/components/portal/ui";
import { bookingStageKeys, bookingStages, money, StatusPill } from "@/components/portal/status";
import { useBookings } from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/portal/itinerary")({
  head: () => ({
    meta: [
      { title: "My Itinerary | BKS Customer Portal" },
      {
        name: "description",
        content:
          "Follow every stage of your BKS journey — approval, payment, driver assignment, apartment readiness and arrival.",
      },
      { property: "og:title", content: "My Itinerary | BKS Customer Portal" },
      {
        property: "og:description",
        content: "A live timeline of your BKS bookings from submission to completion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Itinerary,
});

function apartmentPlace(service: object) {
  const apartment = (
    service as { apartments?: { name?: string | null; city?: string | null } | null }
  ).apartments;
  if (!apartment) return "";
  return [apartment.name, apartment.city].filter(Boolean).join(", ");
}

const kindIcon: Record<string, typeof Car> = {
  apartment: Building2,
  vehicle: Car,
  transfer: PlaneLanding,
  logistics: Truck,
};

function Itinerary() {
  const { data, isLoading, isError, refetch } = useBookings();
  const bookings = data ?? [];

  return (
    <div>
      <PageHeading
        title="My Itinerary"
        description="A live timeline for each journey, from booking submission through to completion."
      />

      {isLoading ? (
        <CardSkeletonGrid count={2} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="Your itinerary is empty"
          description="Book an apartment, vehicle or airport transfer and every stage will be tracked here in real time."
          actionLabel="Browse services"
          to="/services"
        />
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => {
            const idx = bookingStageKeys.indexOf(b.stage as never);
            return (
              <PanelCard key={b.id} className="animate-rise">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {b.reference}
                    </p>
                    <h2 className="mt-1 font-display text-lg font-semibold">{b.title}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" aria-hidden />
                      {b.start_date ?? "TBC"}
                      {b.end_date ? ` → ${b.end_date}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill status={b.status} />
                    <p className="mt-2 font-display text-base font-bold">
                      {money(b.total_amount, b.currency ?? "ZMW")}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <StageTimeline stages={[...bookingStages]} currentIndex={idx < 0 ? 0 : idx} />
                </div>

                {b.booking_services.length > 0 && (
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {b.booking_services.map((s) => {
                      const Icon = kindIcon[String(s.kind)] ?? RouteIcon;
                      return (
                        <li
                          key={s.id}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4"
                        >
                          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                            <Icon className="size-4.5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{s.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.start_at ? new Date(s.start_at).toLocaleDateString() : "TBC"}
                              {s.end_at ? ` → ${new Date(s.end_at).toLocaleDateString()}` : ""}
                              {apartmentPlace(s) ? ` · ${apartmentPlace(s)}` : ""}
                            </p>
                          </div>
                          <span className="ml-auto text-sm font-semibold tabular-nums">
                            {money(s.amount, b.currency ?? "ZMW")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </PanelCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
