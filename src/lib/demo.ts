/**
 * GLOBAL DEMO DATA POLICY — ScriptsXO
 *
 * demoVisibility = (ENV != production AND user is NOT authenticated)
 *               OR (NEXT_PUBLIC_DEMO_PREVIEW_MODE === "true" AND user is NOT authenticated)
 *
 * Hard rule: authenticated users NEVER see demo/seed data.
 * Every page and component must call shouldShowDemoData() — no per-page logic.
 *
 * Usage (inside a component):
 *   const [showDemo, setShowDemo] = useState(false);
 *   useEffect(() => { setShowDemo(shouldShowDemoData()); }, []);
 *
 * The useEffect wrapper is required to avoid SSR hydration mismatch since
 * this reads document.cookie and window.location.
 */

import { getSessionCookie } from "@/lib/auth";

/** Returns true if the client currently has an active authenticated session. */
export function isAuthenticatedClient(): boolean {
  if (typeof window === "undefined") return false;
  const session = getSessionCookie();
  return !!session?.email;
}

/**
 * Returns true when demo/seed data should be shown.
 * Must be called client-side only (reads document.cookie + window.location).
 *
 * Returns FALSE (always) when the user is authenticated.
 * Returns TRUE when unauthenticated AND (dev hostname OR DEMO_PREVIEW_MODE flag).
 */
export function shouldShowDemoData(): boolean {
  // Authenticated users NEVER see demo data — hard stop.
  if (isAuthenticatedClient()) return false;

  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const isDemoPreview =
    process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE === "true";

  return isDev || isDemoPreview;
}
