import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { loadMyStaffAccess } from "@/hooks/useAdmin";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadMyStaffAccess();
    if (!access.isStaff) {
      throw redirect({ to: "/portal" });
    }
    return { staffAccess: access };
  },
  head: () => ({
    meta: [
      { title: "Admin Console | BKS Investment Group" },
      {
        name: "description",
        content:
          "BKS administration console for user management, role assignment and audit log review.",
      },
      { property: "og:title", content: "BKS Admin Console" },
      { property: "og:description", content: "Manage users, roles and audit logs across BKS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminShell,
});