import type { AdminBooking } from "@/hooks/useAdminData";

export const APARTMENT_ZONE = "Africa/Lusaka";

export type ApartmentAvailability =
  "available" | "reserved" | "occupied" | "maintenance" | "unavailable";

export type StayWindow = {
  apartmentId: string;
  bookingId: string;
  start: string;
  end: string;
  status: string;
};

const OPEN_BOOKING = new Set(["pending", "approved", "in_progress"]);

export function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APARTMENT_ZONE }).format(date);
}

export function staysFromBookings(bookings: AdminBooking[]): StayWindow[] {
  const stays: StayWindow[] = [];
  for (const booking of bookings) {
    if (!OPEN_BOOKING.has(booking.status)) continue;
    for (const service of booking.booking_services ?? []) {
      if (!service.apartment_id) continue;
      const start = booking.start_date || service.start_at?.slice(0, 10) || null;
      if (!start) continue;
      const end = booking.end_date || service.end_at?.slice(0, 10) || start;
      stays.push({
        apartmentId: service.apartment_id,
        bookingId: booking.id,
        start,
        end: end < start ? start : end,
        status: booking.status,
      });
    }
  }
  return stays;
}

function covers(stay: StayWindow, day: string) {
  return stay.start <= day && stay.end >= day;
}

/** Status of one calendar day. A stay that has not started is reserved; once it has begun it is occupied through the end date. */
export function availabilityOnDay(
  apartment: { id: string; is_active: boolean; hold_reason?: string | null },
  day: string,
  stays: StayWindow[],
  today = todayKey(),
): ApartmentAvailability {
  if (!apartment.is_active)
    return apartment.hold_reason === "unavailable" ? "unavailable" : "maintenance";
  const hits = stays.filter((stay) => stay.apartmentId === apartment.id && covers(stay, day));
  if (!hits.length) return "available";
  const occupied = hits.some(
    (stay) => (stay.status === "approved" || stay.status === "in_progress") && stay.start <= today,
  );
  return occupied ? "occupied" : "reserved";
}

/** Card status for today, including an upcoming booking that has not reached its start date yet. */
export function currentAvailability(
  apartment: { id: string; is_active: boolean; hold_reason?: string | null },
  stays: StayWindow[],
  today = todayKey(),
): ApartmentAvailability {
  const todayStatus = availabilityOnDay(apartment, today, stays, today);
  if (todayStatus !== "available") return todayStatus;
  const upcoming = stays.some((stay) => stay.apartmentId === apartment.id && stay.start > today);
  return upcoming ? "reserved" : "available";
}
