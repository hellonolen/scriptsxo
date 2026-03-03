"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";

/**
 * Home page -- redirect gateway.
 * Authenticated users go to dashboard, unauthenticated users go to /login.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSessionCookie();
    if (session) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Brief loading state while redirect resolves
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{
          borderColor: "var(--brand-secondary)",
          borderTopColor: "transparent",
        }}
      />
    </main>
  );
}
