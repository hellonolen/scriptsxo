"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProviderConsultationPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/consultation/waiting-room");
  }, [router]);
  return null;
}
