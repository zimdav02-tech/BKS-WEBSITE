import { createFileRoute } from "@tanstack/react-router";
import { ExecutiveDashboard } from "@/components/admin/ExecutiveDashboard";

export const Route = createFileRoute("/_authenticated/admin/executive")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard | BKS Admin" },
      {
        name: "description",
        content: "Business performance, revenue and executive oversight for BKS Investment Group.",
      },
      { property: "og:title", content: "BKS Executive Dashboard" },
      { property: "og:description", content: "Financial visibility and executive insight across BKS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExecutiveDashboard,
});
