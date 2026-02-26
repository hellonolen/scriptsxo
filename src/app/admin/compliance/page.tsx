"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
  ShieldCheck,
  ArrowLeft,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { getSessionCookie } from "@/lib/auth";

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getEventStatus(event: { success: boolean; action: string }): "normal" | "flagged" {
  if (!event.success) return "flagged";
  if (
    event.action === "PHI_EXPORT" ||
    event.action === "PAYMENT_FAILED" ||
    event.action === "PLATFORM_OWNER_REVOKE"
  ) {
    return "flagged";
  }
  return "normal";
}

function getEventLabel(action: string): string {
  const labels: Record<string, string> = {
    PLATFORM_OWNER_SEED: "Platform owner bootstrapped",
    PLATFORM_OWNER_GRANT_REQUESTED: "Platform owner grant requested",
    PLATFORM_OWNER_GRANT_CONFIRMED: "Platform owner grant confirmed",
    PLATFORM_OWNER_GRANT_CANCELLED: "Platform owner grant cancelled",
    PLATFORM_OWNER_REVOKE: "Platform owner revoked",
    ROLE_CHANGE: "Member role changed",
    MEMBER_CAP_OVERRIDE_CHANGE: "Member capability override changed",
    ORG_CAP_OVERRIDE_CHANGE: "Organization capability override changed",
    PHI_EXPORT: "PHI export requested",
    PAYMENT_FAILED: "Payment failed",
    SESSION_CREATED: "Session created",
    SESSION_REVOKED: "Session revoked",
  };
  return labels[action] ?? action;
}

export default function CompliancePage() {
  const session = getSessionCookie();
  const memberId = session?.memberId;

  const sessionToken = session?.sessionToken;

  const events = useQuery(
    api.platformAdmin.listSecurityEvents,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );

  const pendingVerifications = useQuery(
    api.credentialVerifications.getPending,
    sessionToken ? { sessionToken } : "skip"
  );

  const isLoadingEvents = events === undefined;
  const isLoadingVerifications = pendingVerifications === undefined;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">ADMINISTRATION</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Compliance
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          ID verifications, audit logs, and HIPAA compliance.
        </p>

        {/* Pending Verifications */}
        <div className="mb-8">
          <h2 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary" aria-hidden="true" />
            Pending Verifications
            {!isLoadingVerifications && pendingVerifications && (
              <span className="text-muted-foreground font-normal">
                ({pendingVerifications.length})
              </span>
            )}
          </h2>

          {isLoadingVerifications ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-sm">Loading verifications...</span>
            </div>
          ) : !pendingVerifications || pendingVerifications.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <FileCheck size={32} className="text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No pending verifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVerifications.map((item) => (
                <div
                  key={item._id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <FileCheck size={18} className="text-yellow-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.selectedRole} &mdash; step: {item.currentStep} &mdash;{" "}
                        {formatTimestamp(item.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-[5px] hover:bg-primary/90 transition-colors">
                      Approve
                    </button>
                    <button className="px-3 py-1.5 border border-border text-foreground text-xs rounded-[5px] hover:bg-muted transition-colors">
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div>
          <h2 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
            Recent Audit Log
          </h2>

          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-sm">Loading audit events...</span>
            </div>
          ) : !events || events.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <ShieldCheck size={32} className="text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No security events recorded yet</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {events.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <div key={event._id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {status === "flagged" ? (
                          <AlertTriangle size={16} className="text-yellow-500 shrink-0" aria-hidden="true" />
                        ) : (
                          <CheckCircle size={16} className="text-green-500 shrink-0" aria-hidden="true" />
                        )}
                        <div>
                          <p className="text-sm text-foreground">{getEventLabel(event.action)}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.actorMemberId
                              ? `Member: ${event.actorMemberId}`
                              : "System"}
                            {event.reason ? ` — ${event.reason}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        {status === "flagged" && (
                          <Badge variant="warning">Flagged</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
