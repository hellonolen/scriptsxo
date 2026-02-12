import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Bot,
  BarChart3,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Pill,
  UserCheck,
  Clock,
  FileText,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description:
    "ScriptsXO administration dashboard -- providers, compliance, agents, and analytics.",
};

const STATS = [
  { label: "Active Providers", value: "12", icon: UserCheck },
  { label: "Patients Today", value: "47", icon: Users },
  { label: "Rx Processed", value: "38", icon: Pill },
  { label: "Revenue", value: "$3,525", icon: DollarSign },
] as const;

const SYSTEM_HEALTH = [
  {
    name: "API Services",
    status: "operational" as const,
    detail: "All endpoints responding, avg 42ms",
  },
  {
    name: "Video Consultation",
    status: "operational" as const,
    detail: "99.9% uptime, 0 active issues",
  },
  {
    name: "E-Prescribe Network",
    status: "operational" as const,
    detail: "Connected, Surescripts active",
  },
] as const;

const RECENT_ALERTS = [
  {
    type: "warning" as const,
    message: "Provider Dr. Tran license expires in 30 days",
    time: "2 hours ago",
  },
  {
    type: "info" as const,
    message: "New compliance audit report available for Q1 2026",
    time: "5 hours ago",
  },
  {
    type: "warning" as const,
    message: "Prescription volume 23% above daily average",
    time: "8 hours ago",
  },
] as const;

const ADMIN_CARDS = [
  {
    icon: Users,
    title: "Providers",
    description: "Manage provider roster, credentials, and availability.",
    href: "/admin/providers",
    stat: "12 Active",
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
    stat: "2 Pending",
  },
  {
    icon: Bot,
    title: "AI Agents",
    description:
      "Configure triage AI, prescription assistant, and chatbot.",
    href: "/admin/agents",
    stat: "3 Active",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Platform metrics, consultation data, and revenue reports.",
    href: "/admin/analytics",
    stat: "View Reports",
  },
] as const;

export default function AdminPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-12 pb-8 border-b border-border">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase mb-2 font-light">
              Administration
            </p>
            <h1
              className="text-3xl lg:text-4xl text-foreground font-light tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground font-light mt-1">
              System overview and platform management.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {STATS.map((stat) => (
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

          {/* System Health + Recent Alerts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            {/* System Health */}
            <div className="bg-card border border-border rounded-sm p-8">
              <h2
                className="text-lg text-foreground font-light mb-6"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                System Health
              </h2>
              <div className="space-y-5">
                {SYSTEM_HEALTH.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle
                      size={16}
                      className="text-green-600 mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-light text-foreground">
                        {service.name}
                      </p>
                      <p className="text-xs font-light text-muted-foreground mt-0.5">
                        {service.detail}
                      </p>
                    </div>
                    <Badge variant="success" className="ml-auto flex-shrink-0">
                      Operational
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-card border border-border rounded-sm p-8">
              <h2
                className="text-lg text-foreground font-light mb-6"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Recent Alerts
              </h2>
              <div className="space-y-5">
                {RECENT_ALERTS.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {alert.type === "warning" ? (
                      <AlertTriangle
                        size={16}
                        className="text-yellow-600 mt-0.5 flex-shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Clock
                        size={16}
                        className="text-brand-secondary mt-0.5 flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-foreground">
                        {alert.message}
                      </p>
                      <p className="text-xs font-light text-muted-foreground mt-0.5">
                        {alert.time}
                      </p>
                    </div>
                    <Badge
                      variant={alert.type === "warning" ? "warning" : "info"}
                      className="flex-shrink-0"
                    >
                      {alert.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADMIN_CARDS.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group p-8 bg-card border border-border rounded-sm hover:border-brand-secondary/40 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-sm bg-brand-secondary-muted flex items-center justify-center mb-5">
                  <card.icon
                    size={18}
                    className="text-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h3
                  className="text-lg text-foreground font-light mb-2"
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
      </main>
    </>
  );
}
