import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeading, PanelCard, RowSkeleton } from "@/components/portal/ui";
import { money, StatusPill } from "@/components/portal/status";
import { useBookings } from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/portal/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings | BKS Customer Portal" },
      { name: "description", content: "Search, filter and review every BKS booking with references, dates, amounts and status." },
      { property: "og:title", content: "My Bookings | BKS Customer Portal" },
      { property: "og:description", content: "Your complete BKS booking history in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Bookings,
});

function Bookings() {
  const { data, isLoading, isError, refetch } = useBookings();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (b) =>
        !term ||
        b.reference.toLowerCase().includes(term) ||
        (b.title ?? "").toLowerCase().includes(term) ||
        b.status.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div>
      <PageHeading title="My Bookings" description="Every booking you have made with BKS." />

      <PanelCard>
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search reference, title or status"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search bookings"
          />
        </label>

        <div className="mt-6">
          {isLoading ? (
            <RowSkeleton />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No bookings found"
              description="When you book a BKS service it will appear here with its reference and live status."
              actionLabel="Browse services"
              to="/services"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Dates</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-t border-border transition hover:bg-muted/40">
                      <td className="px-3 py-3 font-mono text-xs">{b.reference}</td>
                      <td className="px-3 py-3 font-medium">{b.title}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {b.start_date ?? "TBC"}
                        {b.end_date ? ` → ${b.end_date}` : ""}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {money(b.total_amount, b.currency ?? "ZMW")}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PanelCard>
    </div>
  );
}