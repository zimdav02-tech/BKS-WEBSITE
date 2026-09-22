import {
  Headphones,
  LayoutDashboard,
  type LucideIcon,
  PlaneLanding,
  Route as RouteIcon,
  Ticket,
} from "lucide-react";

export type NavItem = { title: string; to: string; icon: LucideIcon };

export const portalNav: NavItem[] = [
  { title: "Dashboard", to: "/portal", icon: LayoutDashboard },
  { title: "My Itinerary", to: "/portal/itinerary", icon: RouteIcon },
  { title: "My Bookings", to: "/portal/bookings", icon: Ticket },
  { title: "Airport Transfers", to: "/portal/transfers", icon: PlaneLanding },
  { title: "Support", to: "/portal/support", icon: Headphones },
];

export const mobileNav: NavItem[] = portalNav;