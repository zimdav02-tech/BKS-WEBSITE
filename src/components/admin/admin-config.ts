import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Car,
  CircleDollarSign,
  ClipboardList,
  Construction,
  CreditCard,
  FileClock,
  Gauge,
  Globe2,
  HandCoins,
  Headphones,
  LayoutDashboard,
  MapPinned,
  PackageOpen,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  to: string;
  icon: LucideIcon;
  section: "Command" | "Operations" | "Business" | "Administration";
};

export const adminNav: AdminNavItem[] = [
  { title: "Dashboard", to: "/admin", icon: LayoutDashboard, section: "Command" },
  { title: "Operations Centre", to: "/admin/operations", icon: Activity, section: "Command" },
  { title: "Executive Dashboard", to: "/admin/executive", icon: Gauge, section: "Command" },
  { title: "Bookings", to: "/admin/bookings", icon: BookOpenCheck, section: "Operations" },
  { title: "Apartments", to: "/admin/apartments", icon: Building2, section: "Operations" },
  { title: "Vehicles", to: "/admin/vehicles", icon: Car, section: "Operations" },
  { title: "Airport Transfers", to: "/admin/transfers", icon: MapPinned, section: "Operations" },
  { title: "Calendar", to: "/admin/calendar", icon: CalendarDays, section: "Operations" },
  { title: "Real Estate", to: "/admin/real-estate", icon: BriefcaseBusiness, section: "Business" },
  { title: "Construction", to: "/admin/construction", icon: Construction, section: "Business" },
  { title: "Cargo & Logistics", to: "/admin/logistics", icon: Truck, section: "Business" },
  { title: "BKS Get Cash", to: "/admin/get-cash", icon: HandCoins, section: "Business" },
  { title: "Customers", to: "/admin/customers", icon: Users, section: "Administration" },
  { title: "Payments", to: "/admin/payments", icon: CreditCard, section: "Administration" },
  { title: "Support Centre", to: "/admin/support", icon: Headphones, section: "Administration" },
  { title: "Employees", to: "/admin/employees", icon: ShieldCheck, section: "Administration" },
  { title: "Reports & Analytics", to: "/admin/reports", icon: BarChart3, section: "Administration" },
  { title: "Website CMS", to: "/admin/cms", icon: Globe2, section: "Administration" },
  { title: "Notifications", to: "/admin/notifications", icon: Bell, section: "Administration" },
  { title: "Audit Logs", to: "/admin/audit-logs", icon: FileClock, section: "Administration" },
  { title: "Settings", to: "/admin/settings", icon: Settings, section: "Administration" },
];

export const moduleDetails: Record<string, { title: string; description: string; icon: LucideIcon }> = {
  executive: { title: "Executive Dashboard", description: "Strategic performance, revenue and operational health at a glance.", icon: Gauge },
  apartments: { title: "Apartment Management", description: "Inventory, occupancy, housekeeping, maintenance and reservation readiness.", icon: Building2 },
  vehicles: { title: "Fleet Management", description: "Vehicle availability, assignments, maintenance and utilization.", icon: Car },
  transfers: { title: "Airport Transfers", description: "Coordinate flights, drivers, vehicles and pickup milestones.", icon: MapPinned },
  calendar: { title: "Master Calendar", description: "One schedule for reservations, transfers, shifts, viewings and maintenance.", icon: CalendarDays },
  "real-estate": { title: "Real Estate", description: "Manage listings, viewings, clients and deal pipelines.", icon: BriefcaseBusiness },
  construction: { title: "Construction", description: "Track projects, milestones, teams, meetings and delivery risks.", icon: Construction },
  logistics: { title: "Cargo & Logistics", description: "Coordinate cargo requests, dispatch, delivery and route progress.", icon: PackageOpen },
  "get-cash": { title: "BKS Get Cash", description: "Review applications, risk checks, approvals and active facilities.", icon: CircleDollarSign },
  customers: { title: "Customer Management", description: "Unified customer profiles, history, documents, support and account controls.", icon: Users },
  payments: { title: "Finance Dashboard", description: "Verify payments, manage invoices, receipts, refunds and revenue reporting.", icon: CreditCard },
  support: { title: "Support Centre", description: "Live conversations, assignments, escalations and service-level performance.", icon: Headphones },
  employees: { title: "Employee Management", description: "Roles, schedules, availability, assignments and performance.", icon: ShieldCheck },
  reports: { title: "Reports & Analytics", description: "Interactive operational and financial intelligence across every division.", icon: BarChart3 },
  cms: { title: "Website CMS", description: "Manage public website content, media, FAQs, news and testimonials.", icon: Globe2 },
  notifications: { title: "Notification Centre", description: "Search, triage and archive operational and customer alerts.", icon: Bell },
  "audit-logs": { title: "Audit Logs", description: "Immutable history of administrative and security-sensitive activity.", icon: FileClock },
  settings: { title: "System Settings", description: "Business configuration, roles, policies, templates and system preferences.", icon: Settings },
};

export const kpis = [
  { label: "Today's bookings", value: "18", delta: "+12%", to: "/admin/bookings", icon: BookOpenCheck },
  { label: "Active customers", value: "1,284", delta: "+4.8%", to: "/admin/customers", icon: Users },
  { label: "Pending approvals", value: "7", delta: "Needs review", to: "/admin/bookings", icon: ClipboardList },
  { label: "Payment verification", value: "11", delta: "ZMW 84,900", to: "/admin/payments", icon: CreditCard },
  { label: "Today's pickups", value: "9", delta: "3 in transit", to: "/admin/transfers", icon: MapPinned },
  { label: "Apartment occupancy", value: "82%", delta: "+6% this week", to: "/admin/apartments", icon: Building2 },
  { label: "Available vehicles", value: "14", delta: "of 23 fleet", to: "/admin/vehicles", icon: Car },
  { label: "Revenue today", value: "ZMW 126K", delta: "+18.2%", to: "/admin/payments", icon: CircleDollarSign },
  { label: "Monthly revenue", value: "ZMW 2.84M", delta: "78% of target", to: "/admin/reports", icon: BarChart3 },
  { label: "Open conversations", value: "13", delta: "4 urgent", to: "/admin/support", icon: Headphones },
];