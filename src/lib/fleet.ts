import type { Database, Tables } from "@/integrations/supabase/types";

export type VehicleStatus = Tables<"vehicles">["status"];
export type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];

export const VEHICLE_BUCKET = "vehicle-images";

export const VEHICLE_STATUSES: { value: VehicleStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "assigned", label: "Assigned" },
  { value: "in_use", label: "In Use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "unavailable", label: "Unavailable" },
];

export const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "4x4",
  "Van",
  "Minibus",
  "Pickup",
  "Luxury",
  "Executive",
];
export const TRANSMISSIONS = ["Automatic", "Manual"];
export const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"];
export const MAINTENANCE_TYPES = [
  "Service",
  "Repair",
  "Inspection",
  "Tyres",
  "Insurance",
  "Cleaning",
  "Other",
];

export const MAINTENANCE_STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function statusLabel(status: string) {
  return (
    VEHICLE_STATUSES.find((item) => item.value === status)?.label ?? status.replaceAll("_", " ")
  );
}

export function statusTone(status: string) {
  switch (status) {
    case "available":
      return "bg-emerald-600 text-white";
    case "reserved":
      return "bg-amber-500 text-white";
    case "assigned":
      return "bg-sky-700 text-white";
    case "in_use":
      return "bg-ink text-gold";
    case "maintenance":
      return "bg-orange-600 text-white";
    default:
      return "bg-zinc-700 text-white";
  }
}

export function maintenanceTone(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-600/10 text-emerald-700 border-emerald-600/30";
    case "in_progress":
      return "bg-orange-600/10 text-orange-700 border-orange-600/30";
    case "cancelled":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-amber-500/10 text-amber-800 border-amber-500/30";
  }
}

/** Customer-facing label. Internal assignment states read as on hire. */
export function publicAvailability(status: string) {
  if (status === "available") return { label: "Available", bookable: true };
  if (status === "maintenance" || status === "unavailable")
    return { label: "Unavailable", bookable: false };
  return { label: "On hire", bookable: false };
}

export function vehicleModelLine(vehicle: { make?: string | null; model?: string | null }) {
  return [vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

export function vehicleImagePath(url: string) {
  const marker = `/${VEHICLE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

export function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function optionalInt(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function moneyAmount(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
