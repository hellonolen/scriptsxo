"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Users,
  ShieldCheck,
  Bot,
  BarChart3,
  ArrowRight,
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
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="mb-10 pb-6 border-b border-border">
          <p className="eyebrow mb-1">ADMINISTRATION</p>
          <h1
            className="text-3xl lg:text-4xl text-foreground font-light tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground font-light mt-1">
            System overview and platform management.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            {
              label: "Active Providers",
              value: providerCount === null ? "—" : String(providerCount),
              icon: UserCheck,
            },
            {
              label: `${term("titlePlural")} Today`,
              value: patientCount === null ? "—" : String(patientCount),
              icon: Users,
            },
            {
              label: "Rx Processed",
              value: recentRxList === undefined ? "—" : String(recentRxList.length),
              icon: Pill,
            },
            {
              label: "Revenue",
              value: "—",
              icon: DollarSign,
            },
          ].map((stat) => (
            <div key={stat.label} className="stats-card">
              <div className="flex items-center justify-between">
                <span className="stats-card-label">{stat.label}</span>
                <stat.icon
                  size={16}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="stats-card-value text-foreground">
                {stat.value}
              </div>
            </div>
          ))}
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
                      className="text-yellow-600 mt-0.5 flex-shrink-0"
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
            <Link
              key={card.title}
              href={card.href}
              className="group p-6 bg-card border border-border rounded-lg hover:border-brand-secondary/40 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-secondary-muted flex items-center justify-center mb-4">
                <card.icon
                  size={18}
                  className="text-foreground"
                  aria-hidden="true"
                />
              </div>
              <h3
                className="text-base text-foreground font-light mb-1.5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground font-light mb-4 leading-relaxed">
                {card.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-[0.1em] text-brand-secondary uppercase font-light">
                  {card.stat}
                </span>
                <ArrowRight
                  size={14}
                  className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
