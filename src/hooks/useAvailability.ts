import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Tables } from "@/integrations/supabase/types";

export type Blackout = Tables<"apartment_blackouts">;
export type BusyRange = { start_at: string; end_at: string; source: "booking" | "blackout" };

/** Booked + blocked ranges for one apartment (public-safe view of availability). */
export function useApartmentBusyRanges(apartmentId: string | null) {
  return useQuery({
    queryKey: ["availability", "busy", apartmentId],
    enabled: Boolean(apartmentId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("apartment_busy_ranges", {
        _apartment_id: apartmentId as string,
      });
      if (error) throw error;
      return (data ?? []) as BusyRange[];
    },
  });
}

export function useApartmentBlackouts(apartmentId: string | null) {
  return useQuery({
    queryKey: ["availability", "blackouts", apartmentId],
    enabled: Boolean(apartmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apartment_blackouts")
        .select("*")
        .eq("apartment_id", apartmentId as string)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Blackout[];
    },
  });
}

/** Checks a proposed stay before a booking is created. */
export async function checkApartmentAvailable(
  apartmentId: string,
  start: string,
  end: string,
  excludeServiceId?: string,
) {
  const { data, error } = await supabase.rpc("is_apartment_available", {
    _apartment_id: apartmentId,
    _start: start,
    _end: end,
    _exclude_service_id: excludeServiceId ?? undefined,
  });
  if (error) throw error;
  return Boolean(data);
}

export function useCreateBlackout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      apartmentId,
      startDate,
      endDate,
      reason,
    }: {
      apartmentId: string;
      startDate: string;
      endDate: string;
      reason: string | null;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("apartment_blackouts").insert({
        apartment_id: apartmentId,
        start_date: startDate,
        end_date: endDate,
        reason,
        created_by: auth.user?.id ?? null,
      } as never);
      if (error) throw error;
      await logAudit({
        action: "apartment.block_dates",
        entityType: "apartment_blackouts",
        entityId: apartmentId,
        details: { start_date: startDate, end_date: endDate, reason },
      });
    },
    onSuccess: () => {
      toast.success("Dates blocked");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Could not block dates", { description: error.message }),
  });
}

export function useDeleteBlackout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, apartmentId }: { id: string; apartmentId: string }) => {
      const { error } = await supabase.from("apartment_blackouts").delete().eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "apartment.unblock_dates",
        entityType: "apartment_blackouts",
        entityId: apartmentId,
        details: { blackout_id: id },
      });
    },
    onSuccess: () => {
      toast.success("Dates released");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Could not release dates", { description: error.message }),
  });
}
