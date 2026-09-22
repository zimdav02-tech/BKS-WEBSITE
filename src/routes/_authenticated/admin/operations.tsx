import { createFileRoute } from "@tanstack/react-router";
import { OperationsCenter } from "@/components/admin/OperationsCenter";

export const Route = createFileRoute("/_authenticated/admin/operations")({
  head: () => ({
    meta: [
      { title: "Operations Centre | BKS Admin" },
      {
        name: "description",
        content: "Live arrivals, departures, transfers and operational alerts.",
      },
      { property: "og:title", content: "BKS Operations Centre" },
      { property: "og:description", content: "Real-time coordination of BKS services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationsCentrePage,
});

function OperationsCentrePage() {
  return <OperationsCenter />;
}
