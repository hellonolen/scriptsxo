"use client";

/**
 * PAGE CONTEXT TRACKER
 * Silent component — no UI. Runs on every page via AppShell.
 * Records what the patient is viewing/doing to Convex so the
 * concierge LLM has full awareness when the patient chats.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";

/** Map routes to descriptive context the LLM can understand */
function describeRoute(pathname: string): string {
  if (pathname === "/portal") return "Viewing client dashboard overview";
  if (pathname === "/portal/prescriptions") return "Viewing their prescriptions list";
  if (pathname === "/portal/messages") return "Viewing messages inbox";
  if (pathname === "/portal/appointments") return "Viewing appointments list";
  if (pathname === "/portal/billing") return "Viewing billing and payment history";
  if (pathname === "/consultation") return "On the concierge chat page";
  if (pathname === "/intake") return "On the intake landing page";
  if (pathname === "/intake/payment") return "On the membership payment page";
  if (pathname === "/intake/medical-history") return "Filling out medical history form";
  if (pathname === "/intake/symptoms") return "Filling out symptoms and medication request form";
  if (pathname === "/intake/id-verification") return "Uploading identity verification documents";
  if (pathname === "/intake/review") return "Reviewing their intake submission";
  if (pathname === "/start") return "Using the guided intake flow";
  if (pathname.startsWith("/admin")) return "Browsing admin panel";
  if (pathname.startsWith("/provider")) return "Browsing provider portal";
  return `Browsing ${pathname}`;
}

export function PageContextTracker() {
  const pathname = usePathname();
  const updatePageContext = useMutation(api.aiConversations.updatePageContext);
  const getOrCreate = useMutation(api.aiConversations.getOrCreate);
  const lastPath = useRef<string>("");

  useEffect(() => {
    // Only track if the path actually changed
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const session = getSessionCookie();
    if (!session?.email) return;
    // sessionToken is required for Convex mutations — skip tracking if absent
    if (!session?.sessionToken) return;

    // Fire and forget — don't block rendering
    (async () => {
      try {
        const conversationId = await getOrCreate({
          email: session.email,
          sessionToken: session.sessionToken,
        });
        await updatePageContext({
          sessionToken: session.sessionToken,
          conversationId,
          page: pathname,
        });
      } catch {
        // Silent — tracking failure should never break the app
      }
    })();
  }, [pathname]);

  // No UI — this is purely a background tracker
  return null;
}
