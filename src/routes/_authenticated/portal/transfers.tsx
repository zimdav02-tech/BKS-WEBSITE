import { createFileRoute } from "@tanstack/react-router";
import { PlaneLanding } from "lucide-react";
import { CardSkeletonGrid, EmptyState, ErrorState, PageHeading, PanelCard, StageTimeline } from "@/components/portal/ui";
import { StatusPill, transferStageKeys, transferStages } from "@/components/portal/status";
import { useTransfers } from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/portal/transfers")({
  head: () => ({
    meta: [
      { title: "Airport Transfers | BKS Customer Portal" },
      { name: "description", content: "Track BKS airport pickups live — flight details, assigned driver, vehicle and pickup status." },
      { property: "og:title", content: "Airport Transfers | BKS Customer Portal" },
      { property: "og:description", content: "Live airport transfer tracking with BKS Investment Group." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Transfers,
});

function Transfers() {
  const { data, isLoading, isError, refetch } = useTransfers();
  const rows = data ?? [];

  return (
    <div>
      <PageHeading title="Airport Transfers" description="Flight details, driver assignment and live pickup progress." />
      {isLoading ? (
        <CardSkeletonGrid count={2} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PlaneLanding}
          title="No transfers booked"
          description="Book a meet-and-greet airport pickup and we will track your driver here."
          actionLabel="Book airport pickup"
          to="/services/airport-shuttle"
        />
      ) : (
        <div className="space-y-6">
          {rows.map((t) => {
            const idx = transferStageKeys.indexOf(String(t.stage) as never);
            return (
              <PanelCard key={t.id} className="animate-rise">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      {t.flight_number ?? "Flight TBC"} · {t.airport ?? "Airport"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Arrival: {t.arrival_at ? new Date(t.arrival_at).toLocaleString() : "TBC"}
                    </p>
                    <p className="text-sm text-muted-foreground">Pickup: {t.pickup_location ?? "TBC"}</p>
                  </div>
                  <StatusPill status={String(t.stage)} />
                </div>
                <div className="mt-6">
                  <StageTimeline stages={[...transferStages]} currentIndex={idx < 0 ? 0 : idx} />
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver</p>
                    <p className="mt-1 font-semibold">{t.driver_name ?? "To be assigned"}</p>
                    {t.driver_phone && <p className="text-muted-foreground">{t.driver_phone}</p>}
                  </div>
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle</p>
                    <p className="mt-1 font-semibold">{t.vehicles?.name ?? "To be assigned"}</p>
                    {t.vehicles?.registration && (
                      <p className="text-muted-foreground">{t.vehicles.registration}</p>
                    )}
                  </div>
                </div>
              </PanelCard>
            );
          })}
        </div>
      )}
    </div>
  );
}