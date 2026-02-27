"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Users,
  ShieldCheck,
  Bot,
  BarChart3,
  AlertTriangle,
  DollarSign,
  Pill,
  UserCheck,
  Clock,
  FileText,
  Plug,
  Loader2,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { NavCard } from "@/components/ui/nav-card";
import { term } from "@/lib/config";
import { getSessionToken } from "@/lib/auth";

const ADMIN_CARDS = [
  {
    icon: Users,
    title: "Providers",
    description: "Manage provider roster, credentials, and availability.",
    href: "/admin/providers",
    stat: "View All",
  },
  {
    icon: Pill,
    title: "Prescriptions",
    description: "View all prescriptions, generate PDFs, and send faxes.",
    href: "/admin/prescriptions",
    stat: "View All",
  },
  {
    icon: FileText,
    title: "Fax Logs",
    description: "Monitor fax delivery status and retry failed transmissions.",
    href: "/admin/fax-logs",
    stat: "View Logs",
  },
  {
    icon: ShieldCheck,
    title: "Compliance",
    description:
      "Review ID verifications, audit logs, and HIPAA compliance.",
    href: "/admin/compliance",
    stat: "View All",
  },
  {
    icon: Bot,
    title: "AI Agents",
    description:
      "Configure triage AI, prescription assistant, and chatbot.",
    href: "/admin/agents",
    stat: "View All",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Platform metrics, consultation data, and revenue reports.",
    href: "/admin/analytics",
    stat: "View Reports",
  },
  {
    icon: Plug,
    title: "Integrations",
    description:
      "Composio API status, toolkit health, and external service connections.",
    href: "/admin/integrations",
    stat: "View All",
  },
] as const;

export default function AdminPage() {
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const token = getSessionToken();
    if (token) setSessionToken(token);
  }, []);

  const memberCounts = useQuery(
    api.members.countByRole,
    sessionToken ? { sessionToken } : "skip"
  );

  const recentRxList = useQuery(api.prescriptions.listRecent, { limit: 5 });

  const providerCount = (memberCounts as any)?.provider ?? null;
  const patientCount = (memberCounts as any)?.patient ?? null;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <PageHeader
          eyebrow="ADMINISTRATION"
          title="Admin Dashboard"
          description="System overview and platform management."
          border
          size="lg"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Active Providers" value={providerCount === null ? "—" : String(providerCount)} icon={UserCheck} />
          <StatCard label={`${term("titlePlural")} Today`} value={patientCount === null ? "—" : String(patientCount)} icon={Users} />
          <StatCard label="Rx Processed" value={recentRxList === undefined ? "—" : String(recentRxList.length)} icon={Pill} />
          <StatCard label="Revenue" value="—" icon={DollarSign} />
        </div>

        {/* System Health + Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* System Health */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2
              className="text-lg text-foreground font-light mb-5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              System Health
            </h2>
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground font-light">
              <Activity size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
              <p>System health monitoring — coming soon. Live service status will appear here.</p>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2
              className="text-lg text-foreground font-light mb-5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Recent Prescriptions
            </h2>
            {recentRxList === undefined ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-light">Loading...</p>
              </div>
            ) : recentRxList.length === 0 ? (
              <div className="flex items-start gap-3 py-4">
                <Clock size={16} className="text-brand-secondary mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm font-light text-muted-foreground">No prescriptions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRxList.map((rx: any) => (
                  <div key={rx._id} className="flex items-start gap-3">
                    <AlertTriangle
                      size={16}
                      className="text-warning mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-foreground truncate">
                        {rx.medicationName} — {rx.dosage}
                      </p>
                      <p className="text-xs font-light text-muted-foreground mt-0.5">
                        Status: {rx.status}
                      </p>
                    </div>
                    <Badge
                      variant={rx.status === "signed" || rx.status === "sent" ? "success" : "info"}
                      className="flex-shrink-0"
                    >
                      {rx.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ADMIN_CARDS.map((card) => (
            <NavCard
              key={card.title}
              href={card.href}
              icon={card.icon}
              title={card.title}
              description={card.description}
              stat={card.stat}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
