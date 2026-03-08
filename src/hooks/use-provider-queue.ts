"use client";

import { useState, useEffect, useRef } from "react";
import { consultations } from "@/lib/api";

const POLL_INTERVAL_MS = 15_000;

export function useProviderQueue(providerEmail: string | undefined) {
  const [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(!!providerEmail);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!providerEmail) {
      setQueue([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchQueue = async () => {
      try {
        const data = await consultations.getQueue();
        if (!cancelled) setQueue(data);
      } catch {
        // Non-fatal — keep stale data
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [providerEmail]);

  return {
    queue,
    isLoading,
  };
}
