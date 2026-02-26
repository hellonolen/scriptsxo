"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/**
 * Route-level error boundary — renders inside AppShell so users have nav context.
 * Feels contained, not catastrophic. Provides Retry + Dashboard actions.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SXO-ERROR]", error);
  }, [error]);

  return (
    <AppShell>
      <div className="app-content-sm">
        <div className="mt-20 text-center max-w-md mx-auto">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "color-mix(in srgb, var(--destructive) 10%, transparent)" }}
          >
            <AlertTriangle size={22} className="text-destructive" aria-hidden="true" />
          </div>

          {/* Copy */}
          <p className="eyebrow mb-2">Error</p>
          <h1
            className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em] mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-8 leading-relaxed">
            An unexpected error occurred on this page. Try again or return to the dashboard.
            {error.digest && (
              <span className="block mt-2 font-mono text-xs opacity-40">
                Ref: {error.digest}
              </span>
            )}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs tracking-[0.12em] uppercase font-medium hover:opacity-90 transition-opacity rounded-md"
              style={{ background: "var(--brand-gradient)" }}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground text-xs tracking-[0.12em] uppercase font-light hover:bg-muted transition-colors rounded-md"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
