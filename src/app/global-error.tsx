"use client";

import { useEffect } from "react";

/**
 * Global error boundary — must provide its own <html>/<body>.
 * Uses inline styles only (CSS files not guaranteed to load).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SXO-GLOBAL-ERROR]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#FAF8F5",
          color: "#1E1037",
          margin: 0,
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, width: "100%" }}>
          {/* Icon block */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(220, 38, 38, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12 }}>
            SCRIPTSXO
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: 10,
              marginTop: 0,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 8, lineHeight: 1.6 }}>
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 28, fontFamily: "monospace" }}>
              Ref: {error.digest}
            </p>
          )}
          {!error.digest && <div style={{ marginBottom: 28 }} />}

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 22px",
                background: "linear-gradient(135deg, #7C3AED, #2DD4BF)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
            <a
              href="/dashboard"
              style={{
                padding: "10px 22px",
                background: "transparent",
                color: "#1E1037",
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
