import { createFileRoute } from "@tanstack/react-router";
import { ApartmentsDashboard } from "@/components/admin/ApartmentsDashboard";

export const Route = createFileRoute("/_authenticated/admin/apartments")({
  head: () => ({
    meta: [
      { title: "Apartments | BKS Admin" },
      {
        name: "description",
        content: "Gallery, availability and booking status for every BKS apartment.",
      },
      { property: "og:title", content: "BKS Apartments Dashboard" },
      { property: "og:description", content: "Live apartment inventory and availability for BKS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApartmentsDashboard,
});
