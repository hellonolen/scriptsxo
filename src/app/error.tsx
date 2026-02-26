"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

/**
 * Route-level error boundary — wraps all authenticated routes.
 * Renders inside the existing layout (html/body), so it inherits fonts and CSS.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to server/monitoring in production
    console.error("[SXO-ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: "var(--background)" }}>
      <div className="text-center max-w-md">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "color-mix(in srgb, var(--destructive) 10%, transparent)" }}
        >
          <AlertTriangle size={24} className="text-destructive" aria-hidden="true" />
        </div>

        {/* Copy */}
        <p className="eyebrow mb-3">Error</p>
        <h1
          className="text-2xl font-light text-foreground tracking-[-0.02em] mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground font-light mb-8 leading-relaxed">
          An unexpected error occurred on this page.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs opacity-50">
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
  );
}
