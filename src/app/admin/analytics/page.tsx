"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, Activity, DollarSign, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";

export default function AnalyticsPage() {
  const [sessionToken, setSessionToken] = useState<string | undefined>();

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.sessionToken) setSessionToken(session.sessionToken);
  }, []);

  // countByRole returns Record<string, number> keyed by role
  const roleCounts = useQuery(
    api.members.countByRole,
    sessionToken ? { sessionToken } : "skip"
  );
  const consultationCount = useQuery(api.consultations.countAll);

  const isLoading = !sessionToken || roleCounts === undefined || consultationCount === undefined;

  const patientCount  = (roleCounts as Record<string, number> | undefined)?.patient   ?? null;
  const providerCount = (roleCounts as Record<string, number> | undefined)?.provider  ?? null;

  return (
    <AppShell>
      <div className="app-content">
        <PageHeader
          eyebrow="ANALYTICS"
          title="Analytics"
          description="Platform performance and revenue metrics."
          backHref="/admin"
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Total Clients"
            value={isLoading ? "—" : (patientCount ?? "—")}
            icon={Users}
            hint="registered members"
          />
          <StatCard
            label="Providers"
            value={isLoading ? "—" : (providerCount ?? "—")}
            icon={Users}
            hint="active clinicians"
          />
          <StatCard
            label="Consultations"
            value={isLoading ? "—" : (consultationCount ?? "—")}
            icon={Activity}
            hint="all time"
          />
          <StatCard
            label="Revenue"
            value="—"
            icon={DollarSign}
            hint="Stripe not connected"
          />
        </div>

        {/* Wait Time */}
        <div className="bg-card border border-border rounded-lg p-5 mb-6 flex items-center gap-4">
          <Clock size={18} className="text-primary flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="section-heading">Avg Wait Time</p>
            <p className="text-xs text-muted-foreground mt-1">
              Telemetry not yet connected. Wait time will be calculated from consultation
              start times once tracking is enabled.
            </p>
          </div>
        </div>

        {/* Specialty Breakdown */}
        <div className="bg-card border border-border rounded-lg p-6 mb-10">
          <h2 className="section-heading mb-4">Consultations by Specialty</h2>
          <div className="h-24 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Specialty breakdown available once consultation data accumulates.
            </p>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="section-heading mb-4">Revenue Trend (Last 30 Days)</h2>
          <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={32} className="text-muted-foreground mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Chart renders with real Stripe revenue data
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
