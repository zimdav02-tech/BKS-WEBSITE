import { createFileRoute } from "@tanstack/react-router";
import { VehicleDashboard } from "@/components/admin/VehicleDashboard";

export const Route = createFileRoute("/_authenticated/admin/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles | BKS Admin" },
      {
        name: "description",
        content:
          "Manage the BKS fleet: photos, availability, assignments, pricing and maintenance.",
      },
      { property: "og:title", content: "BKS Vehicle Dashboard" },
      {
        property: "og:description",
        content: "Live fleet availability, assignments and maintenance for BKS Investment Group.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VehicleDashboard,
});
