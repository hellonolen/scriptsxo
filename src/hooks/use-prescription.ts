"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function usePrescriptions(email: string | undefined) {
  const prescriptions = useQuery(
    api.prescriptions.getByPatientEmail,
    email ? { email } : "skip"
  );

  return {
    prescriptions: prescriptions ?? [],
    isLoading: prescriptions === undefined,
  };
}
