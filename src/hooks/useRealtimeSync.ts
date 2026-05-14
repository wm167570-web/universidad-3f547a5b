import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export function useRealtimeSync() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Realtime sync via Firestore snapshots is handled per-component or can be added here if needed.
    // For now, we rely on manual sync and individual snapshots.
  }, [user, qc]);
}
