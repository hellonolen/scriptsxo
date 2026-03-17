"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const auth = params.get("auth");
    if (auth !== "success") {
      router.push("/login?error=invalid_callback");
      return;
    }

    const session = {
      email: params.get("email") || "",
      name: params.get("name") || "",
      role: params.get("role") || "member",
      isAdmin: params.get("isAdmin") === "true",
      authenticatedAt: Date.now(),
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
    };

    localStorage.setItem("scriptsxo_session", JSON.stringify(session));

    const redirect = params.get("redirect") || "/dashboard";
    router.push(redirect);
  }, [params, router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/40 text-sm tracking-wider">SIGNING YOU IN...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
