import { cn } from "@/lib/utils";

export const bookingStages = [
  "Booking Submitted",
  "Approved",
  "Payment Verified",
  "Driver Assigned",
  "Apartment Ready",
  "Arrival",
  "Completed",
] as const;

export const bookingStageKeys = [
  "submitted",
  "approved",
  "payment_verified",
  "driver_assigned",
  "apartment_ready",
  "arrival",
  "completed",
] as const;

export const transferStages = [
  "Flight Scheduled",
  "Driver Assigned",
  "Driver En Route",
  "Driver Waiting",
  "Passenger Picked Up",
  "Completed",
] as const;

export const transferStageKeys = [
  "flight_scheduled",
  "driver_assigned",
  "driver_en_route",
  "driver_waiting",
  "picked_up",
  "completed",
] as const;

const tones: Record<string, string> = {
  approved: "bg-gold/15 text-foreground border-gold/40",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  in_progress: "bg-gold/15 text-foreground border-gold/40",
  pending: "bg-muted text-muted-foreground border-border",
  under_review: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  refunded: "bg-secondary/10 text-foreground border-border",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        tones[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export const money = (amount: number | string | null, currency = "ZMW") =>
  `${currency} ${Number(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
