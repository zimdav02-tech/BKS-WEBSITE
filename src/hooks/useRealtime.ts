import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeLinkStatus = "connecting" | "live" | "offline";

/**
 * Subscribes once to a set of tables and invalidates cached queries whenever
 * any row changes, so dashboards stay live without a refresh.
 * The channel is created on mount and removed on unmount (no duplicates).
 */
export function useRealtimeInvalidate(
  channelName: string,
  tables: readonly string[],
  filter?: string,
): RealtimeLinkStatus {
  const queryClient = useQueryClient();
  const key = tables.join(",");
  const [status, setStatus] = useState<RealtimeLinkStatus>("connecting");

  useEffect(() => {
    const channel = supabase.channel(channelName);
    for (const table of key.split(",")) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) } as never,
        () => {
          void queryClient.invalidateQueries();
        },
      );
    }
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") setStatus("live");
      else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
        setStatus("offline");
      } else {
        setStatus("connecting");
      }
    });
    return () => {
      setStatus("connecting");
      void supabase.removeChannel(channel);
    };
  }, [channelName, key, filter, queryClient]);

  return status;
}
