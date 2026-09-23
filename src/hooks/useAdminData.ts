import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import type { Tables } from "@/integrations/supabase/types";

export type ServiceRequest = Tables<"service_requests">;
export type AdminBooking = Tables<"bookings"> & {
  booking_services: Tables<"booking_services">[];
  profiles: { full_name: string | null; email: string; phone: string | null } | null;
};

const LIVE_TABLES = [
  "bookings",
  "booking_services",
  "service_requests",
  "payments",
  "airport_transfers",
  "notifications",
  "conversations",
  "messages",
  "profiles",
  "apartments",
  "vehicles",
  "activity_events",
  "audit_logs",
] as const;

/** Staff-wide realtime channel: any change refreshes admin views. */
export function useAdminRealtime() {
  return useRealtimeInvalidate("admin-live", LIVE_TABLES);
}

export function useAdminBookings() {
  return useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, booking_services(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as AdminBooking[];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      if (ids.length) {
        const { data: people } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", ids);
        const map = new Map((people ?? []).map((p) => [p.id, p]));
        for (const row of rows) row.profiles = (map.get(row.user_id) as never) ?? null;
      }
      return rows;
    },
  });
}

export function useAdminRequests() {
  return useQuery({
    queryKey: ["admin", "requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });
}

export function useAdminPayments() {
  return useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(reference)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Tables<"payments"> & { bookings: { reference: string } | null })[];
    },
  });
}

export function useAdminTransfers() {
  return useQuery({
    queryKey: ["admin", "transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("airport_transfers")
        .select("*, bookings(reference), vehicles(name, registration)")
        .order("arrival_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (Tables<"airport_transfers"> & {
        bookings: { reference: string } | null;
        vehicles: { name: string; registration: string | null } | null;
      })[];
    },
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const [{ data: people, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const map = new Map<string, string[]>();
      for (const r of roles ?? []) {
        map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role as string]);
      }
      return (people ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? ["customer"] }));
    },
  });
}

export function useAdminConversations() {
  return useQuery({
    queryKey: ["admin", "conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(id, body, created_at, sender_id, read_at)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Tables<"conversations"> & {
        messages: Pick<
          Tables<"messages">,
          "id" | "body" | "created_at" | "sender_id" | "read_at"
        >[];
      })[];
    },
  });
}

export function useAdminApartments() {
  return useQuery({
    queryKey: ["admin", "apartments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apartments").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Tables<"apartments">[];
    },
  });
}

export function useAdminVehicles() {
  return useQuery({
    queryKey: ["admin", "vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Tables<"vehicles">[];
    },
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: ["admin", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as Tables<"activity_events">[];
    },
  });
}

export function useAdminNotifications() {
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Tables<"notifications">[];
    },
  });
}

/** Live KPI aggregates for the command centre. */
export function useAdminKpis() {
  return useQuery({
    queryKey: ["admin", "kpis"],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const count = (q: { count: number | null }) => q.count ?? 0;

      const [
        bookingsToday,
        pendingBookings,
        totalBookings,
        openRequests,
        paymentsPending,
        transfersToday,
        customers,
        openConversations,
        approvedPayments,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfDay),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["new", "in_review"]),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "under_review"]),
        supabase
          .from("airport_transfers")
          .select("id", { count: "exact", head: true })
          .gte("arrival_at", startOfDay),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase
          .from("payments")
          .select("amount")
          .eq("status", "approved")
          .gte("created_at", startOfMonth),
      ]);

      const monthRevenue = (approvedPayments.data ?? []).reduce(
        (sum, p) => sum + Number(p.amount ?? 0),
        0,
      );

      return {
        bookingsToday: count(bookingsToday),
        pendingBookings: count(pendingBookings),
        totalBookings: count(totalBookings),
        openRequests: count(openRequests),
        paymentsPending: count(paymentsPending),
        transfersToday: count(transfersToday),
        customers: count(customers),
        openConversations: count(openConversations),
        monthRevenue,
      };
    },
  });
}

/* ---------------------------------- actions --------------------------------- */

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reference,
      patch,
      action = "booking.update",
      details,
    }: {
      id: string;
      reference: string;
      patch: Partial<Tables<"bookings">>;
      action?: string;
      details?: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("bookings")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        action,
        entityType: "bookings",
        entityId: id,
        details: { reference, ...patch, ...details },
      });
    },
    onSuccess: () => {
      toast.success("Booking updated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Tables<"service_requests">>;
    }) => {
      const { error } = await supabase
        .from("service_requests")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "service_request.update",
        entityType: "service_requests",
        entityId: id,
        details: patch as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      toast.success("Request updated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Tables<"payments">["status"] }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("payments")
        .update({
          status,
          reviewed_by: auth.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        } as never)
        .eq("id", id);
      if (error) throw error;
      await logAudit({ action: `payment.${status}`, entityType: "payments", entityId: id });
    },
    onSuccess: () => {
      toast.success("Payment reviewed");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reference,
      startDate,
      endDate,
      services,
    }: {
      id: string;
      reference: string;
      startDate: string | null;
      endDate: string | null;
      services: { id: string; start_at: string | null; end_at: string | null }[];
    }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ start_date: startDate, end_date: endDate } as never)
        .eq("id", id);
      if (error) throw error;
      for (const service of services) {
        const { error: serviceError } = await supabase
          .from("booking_services")
          .update({ start_at: service.start_at, end_at: service.end_at } as never)
          .eq("id", service.id);
        if (serviceError) throw serviceError;
      }
      await logAudit({
        action: "booking.reschedule",
        entityType: "bookings",
        entityId: id,
        details: { reference, start_date: startDate, end_date: endDate },
      });
    },
    onSuccess: () => {
      toast.success("Booking rescheduled");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Reschedule failed", { description: error.message }),
  });
}

export function useAddBookingNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reference,
      note,
    }: {
      id: string;
      reference: string;
      note: string;
    }) => {
      await logAudit({
        action: "booking.note",
        entityType: "bookings",
        entityId: id,
        details: { reference, note },
      });
    },
    onSuccess: () => {
      toast.success("Internal note added");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Could not save note", { description: error.message }),
  });
}

export function useUpdateBookingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      bookingId,
      reference,
      patch,
    }: {
      id: string;
      bookingId: string;
      reference: string;
      patch: Partial<Tables<"booking_services">>;
    }) => {
      const { error } = await supabase
        .from("booking_services")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "booking.assign",
        entityType: "bookings",
        entityId: bookingId,
        details: { reference, service_id: id, ...patch },
      });
    },
    onSuccess: () => {
      toast.success("Assignment updated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Assignment failed", { description: error.message }),
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Tables<"airport_transfers">>;
    }) => {
      const { error } = await supabase
        .from("airport_transfers")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "transfer.update",
        entityType: "airport_transfers",
        entityId: id,
        details: patch as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      toast.success("Transfer updated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });
}

const APARTMENT_BUCKET = "apartment-images";

export type ApartmentInput = {
  name: string;
  unit_type: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  bedrooms: number;
  nightly_rate: number;
  amenities: string[];
  house_rules: string | null;
  map_url: string | null;
  is_active: boolean;
  hold_reason: string | null;
  images?: string[];
};

export function useSaveApartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ApartmentInput }) => {
      if (id) {
        const { error } = await supabase
          .from("apartments")
          .update(values as never)
          .eq("id", id);
        if (error) throw error;
        await logAudit({
          action: "apartment.update",
          entityType: "apartments",
          entityId: id,
          details: {
            name: values.name,
            nightly_rate: values.nightly_rate,
            is_active: values.is_active,
          },
        });
        return id;
      }
      const { data, error } = await supabase
        .from("apartments")
        .insert(values as never)
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({
        action: "apartment.create",
        entityType: "apartments",
        entityId: data.id,
        details: { name: values.name },
      });
      return data.id;
    },
    onSuccess: () => {
      toast.success("Apartment saved");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error("Could not save apartment", { description: error.message }),
  });
}

export async function uploadApartmentImage(apartmentId: string, file: File) {
  const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(0, 80);
  const path = `${apartmentId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(APARTMENT_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(APARTMENT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeApartmentImage(url: string) {
  const marker = `/${APARTMENT_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  if (!path) return;
  const { error } = await supabase.storage.from(APARTMENT_BUCKET).remove([path]);
  if (error) throw error;
}
