"use client";

import { useState, useEffect } from "react";
import { prescriptions } from "@/lib/api";

export function usePrescriptions(email: string | undefined) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(!!email);

  useEffect(() => {
    if (!email) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    prescriptions
      .getByPatient(email)
      .then((results) => {
        if (!cancelled) setData(results);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  return {
    prescriptions: data,
    isLoading,
  };
}
