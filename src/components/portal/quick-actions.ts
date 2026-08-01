import {
  Building2,
  Car,
  HardHat,
  PlaneLanding,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type QuickAction = { title: string; to: string; icon: LucideIcon; blurb: string };

export const quickActions: QuickAction[] = [
  {
    title: "Book Apartment",
    to: "/services/furnished-apartments",
    icon: Building2,
    blurb: "Fully serviced stays across Zambia.",
  },
  { title: "Hire Vehicle", to: "/services/car-hire", icon: Car, blurb: "Self-drive or chauffeured." },
  {
    title: "Book Airport Pickup",
    to: "/services/airport-shuttle",
    icon: PlaneLanding,
    blurb: "Meet-and-greet transfers.",
  },
  {
    title: "Request Cargo Service",
    to: "/services/cargo-logistics",
    icon: Truck,
    blurb: "Freight and last-mile delivery.",
  },
  {
    title: "Apply for BKS Get Cash",
    to: "/services/get-cash",
    icon: Wallet,
    blurb: "Fast, transparent facilities.",
  },
  {
    title: "Construction Consultation",
    to: "/services/construction",
    icon: HardHat,
    blurb: "Build, renovate, project manage.",
  },
];