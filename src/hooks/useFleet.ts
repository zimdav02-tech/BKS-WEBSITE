import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import { logAudit } from "@/lib/audit";
import { VEHICLE_BUCKET, vehicleImagePath, type MaintenanceStatus } from "@/lib/fleet";
import type { Tables } from "@/integrations/supabase/types";

export type FleetVehicle = Tables<"vehicles">;
export type MaintenanceRow = Tables<"vehicle_maintenance"> & {
  vehicles: { name: string; registration: string | null } | null;
};

export type VehicleInput = {
  name: string;
  registration: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  category: string | null;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  seats: number;
  daily_rate: number;
  hourly_rate: number;
  fuel_policy: string | null;
  insurance_info: string | null;
  notes: string | null;
};

export type MaintenanceInput = {
  id?: string;
  vehicle_id: string;
  maintenance_type: string;
  serviced_on: string;
  mileage: number | null;
  cost: number | null;
  next_service_on: string | null;
  status: MaintenanceStatus;
  notes: string | null;
  hold: "maintenance" | "available" | null;
};

const OPEN_BOOKING = ["pending", "approved", "in_progress"] as const;

export function usePublicFleet() {
  useRealtimeInvalidate("public-fleet", ["vehicles"]);
  return useQuery({
    queryKey: ["public", "vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, name, registration, category, make, model, year, images, daily_rate, hourly_rate, seats, transmission, fuel_type, status, is_active",
        )
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminMaintenance() {
  return useQuery({
    queryKey: ["admin", "vehicle_maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select("*, vehicles(name, registration)")
        .order("serviced_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaintenanceRow[];
    },
  });
}

export function useSaveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: VehicleInput }) => {
      if (id) {
        const { error } = await supabase.from("vehicles").update(input).eq("id", id);
        if (error) throw error;
        await logAudit({
          action: "vehicle.update",
          entityType: "vehicles",
          entityId: id,
          details: input,
        });
        return id;
      }
      const { data, error } = await supabase.from("vehicles").insert(input).select("id").single();
      if (error) throw error;
      await logAudit({
        action: "vehicle.create",
        entityType: "vehicles",
        entityId: data.id,
        details: input,
      });
      return data.id;
    },
    onSuccess: () => {
      toast.success("Vehicle saved");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error("Could not save vehicle", { description: error.message }),
  });
}

export function useSetVehicleHold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      hold,
      name,
    }: {
      id: string;
      hold: "maintenance" | "unavailable" | null;
      name: string;
    }) => {
      const { error } = await supabase.from("vehicles").update({ service_hold: hold }).eq("id", id);
      if (error) throw error;
      await logAudit({
        action: hold ? `vehicle.${hold}` : "vehicle.available",
        entityType: "vehicles",
        entityId: id,
        details: { name, service_hold: hold },
      });
    },
    onSuccess: () => {
      toast.success("Availability updated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error("Could not update availability", { description: error.message }),
  });
}

export async function uploadVehicleImages(vehicleId: string, files: File[]) {
  const urls: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5 MB`);
    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${vehicleId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from(VEHICLE_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    urls.push(supabase.storage.from(VEHICLE_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

export function useVehicleImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      images,
      files,
      remove,
    }: {
      id: string;
      images: string[];
      files?: File[];
      remove?: string;
    }) => {
      let next = images;
      if (remove) {
        next = images.filter((url) => url !== remove);
        const path = vehicleImagePath(remove);
        if (path) {
          const { error } = await supabase.storage.from(VEHICLE_BUCKET).remove([path]);
          if (error) throw error;
        }
      }
      if (files?.length) {
        const uploaded = await uploadVehicleImages(id, files);
        next = [...next, ...uploaded];
      }
      const { error } = await supabase.from("vehicles").update({ images: next }).eq("id", id);
      if (error) throw error;
      await logAudit({
        action: remove ? "vehicle.image_remove" : "vehicle.image_upload",
        entityType: "vehicles",
        entityId: id,
        details: { count: next.length },
      });
    },
    onSuccess: () => {
      toast.success("Photos updated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error("Could not update photos", { description: error.message }),
  });
}

export function useAssignVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vehicle,
      bookingId,
      reference,
    }: {
      vehicle: FleetVehicle;
      bookingId: string;
      reference: string;
    }) => {
      if (vehicle.service_hold === "maintenance" || vehicle.service_hold === "unavailable") {
        throw new Error("Return the vehicle to service before assigning it");
      }
      const { data: services, error } = await supabase
        .from("booking_services")
        .select("id, kind, vehicle_id, label")
        .eq("booking_id", bookingId);
      if (error) throw error;
      const rows = services ?? [];
      if (rows.some((row) => row.vehicle_id === vehicle.id)) return;

      const line =
        rows.find((row) => row.kind === "vehicle" && !row.vehicle_id) ??
        rows.find((row) => row.kind === "vehicle") ??
        rows.find((row) => row.kind === "airport_transfer" && !row.vehicle_id);

      if (line) {
        const { error: updateError } = await supabase
          .from("booking_services")
          .update({
            vehicle_id: vehicle.id,
            ...(line.kind === "vehicle" ? { label: vehicle.name } : {}),
          })
          .eq("id", line.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("booking_services").insert({
          booking_id: bookingId,
          kind: "vehicle",
          label: vehicle.name,
          vehicle_id: vehicle.id,
          amount: vehicle.daily_rate,
        });
        if (insertError) throw insertError;
      }
      await logAudit({
        action: "vehicle.assign",
        entityType: "vehicles",
        entityId: vehicle.id,
        details: { reference, booking_id: bookingId },
      });
    },
    onSuccess: () => {
      toast.success("Vehicle assigned");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Assignment failed", { description: error.message }),
  });
}

export function useReleaseVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data: services, error } = await supabase
        .from("booking_services")
        .select("id, booking_id")
        .eq("vehicle_id", id);
      if (error) throw error;
      const bookingIds = [...new Set((services ?? []).map((row) => row.booking_id))];
      let open = new Set<string>();
      if (bookingIds.length) {
        const { data: bookings, error: bookingError } = await supabase
          .from("bookings")
          .select("id, status")
          .in("id", bookingIds);
        if (bookingError) throw bookingError;
        open = new Set(
          (bookings ?? [])
            .filter((row) => OPEN_BOOKING.includes(row.status as (typeof OPEN_BOOKING)[number]))
            .map((row) => row.id),
        );
      }
      for (const service of services ?? []) {
        if (!open.has(service.booking_id)) continue;
        const { error: updateError } = await supabase
          .from("booking_services")
          .update({ vehicle_id: null })
          .eq("id", service.id);
        if (updateError) throw updateError;
      }
      const { data: transfers, error: transferError } = await supabase
        .from("airport_transfers")
        .select("id, stage")
        .eq("vehicle_id", id);
      if (transferError) throw transferError;
      for (const transfer of transfers ?? []) {
        if (transfer.stage === "completed") continue;
        const { error: updateError } = await supabase
          .from("airport_transfers")
          .update({ vehicle_id: null })
          .eq("id", transfer.id);
        if (updateError) throw updateError;
      }
      await logAudit({
        action: "vehicle.release",
        entityType: "vehicles",
        entityId: id,
        details: { name },
      });
    },
    onSuccess: () => {
      toast.success("Vehicle released");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error("Could not release vehicle", { description: error.message }),
  });
}

export function useSaveMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MaintenanceInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const row = {
        vehicle_id: input.vehicle_id,
        maintenance_type: input.maintenance_type,
        serviced_on: input.serviced_on,
        mileage: input.mileage,
        cost: input.cost,
        next_service_on: input.next_service_on,
        status: input.status,
        notes: input.notes,
        recorded_by: auth.user?.id ?? null,
      };
      if (input.id) {
        const { error } = await supabase.from("vehicle_maintenance").update(row).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicle_maintenance").insert(row);
        if (error) throw error;
      }
      if (input.hold === "maintenance") {
        const { error } = await supabase
          .from("vehicles")
          .update({ service_hold: "maintenance" })
          .eq("id", input.vehicle_id);
        if (error) throw error;
      } else if (input.hold === "available") {
        const { error } = await supabase
          .from("vehicles")
          .update({ service_hold: null })
          .eq("id", input.vehicle_id);
        if (error) throw error;
      }
      await logAudit({
        action: input.id ? "vehicle.maintenance_update" : "vehicle.maintenance_create",
        entityType: "vehicle_maintenance",
        entityId: input.vehicle_id,
        details: { ...row, hold: input.hold },
      });
    },
    onSuccess: () => {
      toast.success("Maintenance saved");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      toast.error("Could not save maintenance", { description: error.message }),
  });
}
