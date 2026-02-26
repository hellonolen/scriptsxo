"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";

/**
 * /dashboard/order — Routes to the appropriate intake step.
 * If user has an active intake, continues from where they left off.
 * Otherwise starts fresh at /intake/payment.
 */
export default function DashboardOrderPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSessionCookie();
    if (!session?.email) {
      router.push("/");
      return;
    }

    // Check for existing intake in progress
    const existingIntakeId = localStorage.getItem("sxo_intake_id");
    if (existingIntakeId) {
      // Resume intake — go to medical history (first data-entry step)
      router.push("/intake/medical-history");
    } else {
      // Start fresh intake
      router.push("/intake/payment");
    }
  }, [router]);

  return null;
}
