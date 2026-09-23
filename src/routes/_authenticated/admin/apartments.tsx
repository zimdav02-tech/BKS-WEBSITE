import { createFileRoute } from "@tanstack/react-router";
import { ApartmentAvailability } from "@/components/admin/ApartmentAvailability";

export const Route = createFileRoute("/_authenticated/admin/apartments")({
  head: () => ({
    meta: [
      { title: "Apartment Availability | BKS Admin" },
      {
        name: "description",
        content:
          "Track booked and blocked nights for every BKS apartment and prevent double bookings.",
      },
      { property: "og:title", content: "BKS Apartment Availability" },
      {
        property: "og:description",
        content: "Live occupancy calendar and date blocking for BKS furnished apartments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApartmentAvailability,
});
