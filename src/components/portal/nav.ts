import {
  Bell,
  Building2,
  CalendarDays,
  Car,
  CreditCard,
  FileText,
  Heart,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  PlaneLanding,
  Route as RouteIcon,
  Settings,
  Star,
  Ticket,
  UserRound,
} from "lucide-react";

export type NavItem = { title: string; to: string; icon: LucideIcon };

export const portalNav: NavItem[] = [
  { title: "Dashboard", to: "/portal", icon: LayoutDashboard },
  { title: "My Itinerary", to: "/portal/itinerary", icon: RouteIcon },
  { title: "My Bookings", to: "/portal/bookings", icon: Ticket },
  { title: "My Apartments", to: "/portal/apartments", icon: Building2 },
  { title: "My Vehicles", to: "/portal/vehicles", icon: Car },
  { title: "Airport Transfers", to: "/portal/transfers", icon: PlaneLanding },
  { title: "Payments", to: "/portal/payments", icon: CreditCard },
  { title: "Documents", to: "/portal/documents", icon: FileText },
  { title: "Notifications", to: "/portal/notifications", icon: Bell },
  { title: "Support Chat", to: "/portal/support", icon: MessageSquare },
  { title: "Reviews", to: "/portal/reviews", icon: Star },
  { title: "Saved Services", to: "/portal/saved", icon: Heart },
  { title: "Calendar", to: "/portal/calendar", icon: CalendarDays },
  { title: "Profile", to: "/portal/profile", icon: UserRound },
  { title: "Settings", to: "/portal/settings", icon: Settings },
];

export const mobileNav: NavItem[] = [
  portalNav[0]!,
  portalNav[1]!,
  portalNav[6]!,
  portalNav[8]!,
  portalNav[9]!,
];