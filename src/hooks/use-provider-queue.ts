"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useProviderQueue(providerEmail: string | undefined) {
  const queue = useQuery(
    api.consultations.getProviderQueue,
    providerEmail ? { providerEmail } : "skip"
  );

  return {
    queue: queue ?? [],
    isLoading: queue === undefined,
  };
}
