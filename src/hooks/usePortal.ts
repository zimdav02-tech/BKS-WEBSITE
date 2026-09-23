import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import type { Tables } from "@/integrations/supabase/types";

export type Booking = Tables<"bookings">;
export type BookingService = Tables<"booking_services">;
export type Payment = Tables<"payments">;
export type Transfer = Tables<"airport_transfers">;
export type DocumentRow = Tables<"documents">;
export type NotificationRow = Tables<"notifications">;
export type MessageRow = Tables<"messages">;
export type ReviewRow = Tables<"reviews">;
export type SavedRow = Tables<"saved_services">;
export type ActivityRow = Tables<"activity_events">;
export type Apartment = Tables<"apartments">;
export type Vehicle = Tables<"vehicles">;
export type Profile = Tables<"profiles">;

export type BookingWithServices = Booking & { booking_services: BookingService[] };

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfile() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useBookings() {
  const { data: user } = useCurrentUser();
  useRealtimeInvalidate(
    user?.id ? `portal-bookings-${user.id}` : "portal-bookings-idle",
    user?.id ? ["bookings"] : [],
    user?.id ? `user_id=eq.${user.id}` : undefined,
  );
  useRealtimeInvalidate(
    user?.id ? `portal-apartment-live-${user.id}` : "portal-apartment-live-idle",
    user?.id ? ["apartments", "booking_services"] : [],
  );
  return useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, booking_services(*, apartments(*))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookingWithServices[];
    },
  });
}

export function usePayments() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(reference)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Payment & { bookings: { reference: string } | null })[];
    },
  });
}

export function useTransfers() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["transfers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("airport_transfers")
        .select("*, vehicles(name, registration, images), bookings(reference)")
        .eq("user_id", user!.id)
        .order("arrival_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (Transfer & {
        vehicles: Pick<Vehicle, "name" | "registration" | "images"> | null;
        bookings: { reference: string } | null;
      })[];
    },
  });
}

/** Booking services of a given kind, joined with catalogue rows. */
export function useMyServices(kind: BookingService["kind"]) {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["my-services", kind, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_services")
        .select("*, apartments(*), vehicles(*), bookings!inner(reference, status, user_id)")
        .eq("kind", kind)
        .eq("bookings.user_id", user!.id)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (BookingService & {
        apartments: Apartment | null;
        vehicles: Vehicle | null;
        bookings: { reference: string; status: Booking["status"] } | null;
      })[];
    },
  });
}

export function useDocuments() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

export function useNotifications() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useReviews() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });
}

export function useSavedServices() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["saved-services", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_services")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedRow[];
    },
  });
}

export function useActivity(limit = 25) {
  const { data: user } = useCurrentUser();
  useRealtimeInvalidate(
    user?.id ? `portal-activity-${user.id}` : "portal-activity-idle",
    user?.id ? ["activity_events"] : [],
    user?.id ? `user_id=eq.${user.id}` : undefined,
  );
  return useQuery({
    queryKey: ["activity", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });
}

/** Support conversation + realtime messages. */
export function useSupportThread() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const conversation = useQuery({
    queryKey: ["conversation", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      const created = await supabase
        .from("conversations")
        .insert({ user_id: user!.id, subject: "Support" })
        .select("*")
        .single();
      if (created.error) throw created.error;
      return created.data;
    },
  });

  const conversationId = conversation.data?.id;

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["messages", conversationId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const send = useMutation({
    mutationFn: async ({ body, attachment }: { body: string; attachment?: File | null }) => {
      if (!conversationId || !user) throw new Error("No conversation");
      let attachment_path: string | null = null;
      let attachment_name: string | null = null;
      if (attachment) {
        const path = `${user.id}/support/${Date.now()}-${attachment.name}`;
        const up = await supabase.storage.from("customer-documents").upload(path, attachment);
        if (up.error) throw up.error;
        attachment_path = path;
        attachment_name = attachment.name;
      }
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body,
          attachment_path,
          attachment_name,
        });
      if (error) throw error;
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", conversationId] }),
  });

  return { conversation, messages, send, userId: user?.id ?? null };
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.is_read).length;
}
