import { createFileRoute } from "@tanstack/react-router";
import { BookingsDashboard } from "@/components/admin/BookingsDashboard";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings | BKS Admin" },
      {
        name: "description",
        content: "Review, confirm and coordinate every BKS booking from one live dashboard.",
      },
      { property: "og:title", content: "BKS Bookings Dashboard" },
      { property: "og:description", content: "Live booking management for BKS Investment Group." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingsDashboard,
});
