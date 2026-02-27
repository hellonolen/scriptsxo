"use client";

import {
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Download,
  Eye,
  MoreVertical,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";

// --- High Fidelity Mock Data ---
const PENDING_VERIFICATIONS = [
  { id: "ver_1", email: "dr.smith@example.com", role: "provider", step: "license_scan", startedAt: new Date(Date.now() - 1000 * 60 * 45).getTime(), flagged: true },
  { id: "ver_2", email: "j.doe99@gmail.com", role: "patient", step: "id_review", startedAt: new Date(Date.now() - 1000 * 60 * 120).getTime(), flagged: false },
  { id: "ver_3", email: "rx.central@pharmacy.net", role: "pharmacy", step: "ncpdp_check", startedAt: new Date(Date.now() - 1000 * 60 * 300).getTime(), flagged: false },
];

const AUDIT_EVENTS = [
  { id: "evt_1", action: "ROLE_CHANGE", actor: "Alexander Grant", target: "dr.smith@example.com", details: "Changed role from 'unverified' to 'provider'", timestamp: new Date(Date.now() - 1000 * 60 * 5).getTime(), status: "normal" },
  { id: "evt_2", action: "PHI_EXPORT", actor: "System Agent", target: "Patient Records (Batch 42)", details: "Exported 142 records to secure vault", timestamp: new Date(Date.now() - 1000 * 60 * 25).getTime(), status: "flagged" },
  { id: "evt_3", action: "SESSION_REVOKED", actor: "Security Policy", target: "m.jones@gmail.com", details: "Multiple failed login attempts", timestamp: new Date(Date.now() - 1000 * 60 * 140).getTime(), status: "flagged" },
  { id: "evt_4", action: "MEMBER_INVITED", actor: "Dr. Sarah Jenkins", target: "nurse.kelly@clinic.com", details: "Invited to organization 'Genesis Healthcare'", timestamp: new Date(Date.now() - 1000 * 60 * 210).getTime(), status: "normal" },
  { id: "evt_5", action: "PLATFORM_OWNER_GRANT_REQUESTED", actor: "Alexander Grant", target: "Security Admin", details: "Requested elevation to platform owner", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).getTime(), status: "flagged" },
  { id: "evt_6", action: "SYSTEM_BOOTSTRAP", actor: "Deployment Pipeline", target: "Production Environment", details: "V2.4.1 initialized successfully", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).getTime(), status: "normal" },
];

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 1000 * 60 * 60) {
    return `${Math.floor(diff / (1000 * 60))}m ago`;
  }
  if (diff < 1000 * 60 * 60 * 24) {
    return `${Math.floor(diff / (1000 * 60 * 60))}h ago`;
  }
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <PageHeader
            eyebrow="ADMINISTRATION"
            title="Compliance & Audit"
            description="HIPAA logs, identity verifications, and platform security events."
            backHref="/admin"
          />
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <Download size={16} />
              Export Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Main Content Area (Timeline) */}
          <div className="xl:col-span-2 space-y-6">

            {/* Toolbar */}
            <div className="bg-card border border-border rounded-xl">
              <div className="border-b border-border px-1">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: "all", label: "All Events" },
                    { id: "flagged", label: "Flagged Risks" },
                    { id: "access", label: "Access & Auth" },
                    { id: "phi", label: "PHI Access" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search logs by actor, IP, or event type..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <button className="flex items-center justify-between w-full sm:w-auto gap-2 px-3 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-md hover:bg-muted transition-colors shrink-0">
                  <Filter size={14} />
                  Time Range
                  <ChevronDown size={14} className="text-muted-foreground ml-2" />
                </button>
              </div>
            </div>

            {/* Timeline UI */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-medium text-foreground mb-6 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                System Audit Trail
              </h2>

              <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">

                {AUDIT_EVENTS.map((event, i) => (
                  <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                    {/* Timeline Dot */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-card bg-muted shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      {event.status === "flagged" ? (
                        <div className="w-2.5 h-2.5 bg-warning rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                      )}
                    </div>

                    {/* Event Card */}
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-background border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {event.action.replace(/_/g, " ")}
                          </span>
                          {event.status === "flagged" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-warning/10 text-warning border border-warning/20">
                              Review
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-foreground mb-1">
                        {event.details}
                      </p>

                      <div className="flex items-center gap-3 text-xs mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] uppercase">
                            {event.actor.slice(0, 1)}
                          </span>
                          {event.actor}
                        </div>
                        <span className="text-border">•</span>
                        <div className="text-muted-foreground truncate">
                          Target: <span className="text-foreground">{event.target}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}

              </div>

              <div className="mt-8 text-center">
                <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  Load Older Events
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar Area */}
          <div className="space-y-6">

            {/* Pending Verifications */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                  <Clock size={16} className="text-warning" />
                  Action Required
                </h2>
                <span className="bg-warning/10 text-warning text-xs font-bold px-2 py-0.5 rounded-full">
                  {PENDING_VERIFICATIONS.length}
                </span>
              </div>

              <div className="space-y-3">
                {PENDING_VERIFICATIONS.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                          <FileCheck size={12} className="text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {item.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimestamp(item.startedAt)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground mb-3 truncate">
                      {item.email}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-1">
                        <div className="h-1 flex-1 bg-success rounded-full"></div>
                        <div className="h-1 flex-1 bg-success rounded-full"></div>
                        <div className="h-1 flex-1 bg-primary rounded-full animate-pulse"></div>
                        <div className="h-1 flex-1 bg-muted rounded-full"></div>
                      </div>
                      <button className="ml-3 text-[10px] font-semibold text-primary uppercase tracking-wider hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Quick Links */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-base font-medium text-foreground mb-4">Compliance Center</h2>
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between p-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  <span>HIPAA Business Associates</span>
                  <Eye size={14} />
                </button>
                <button className="w-full flex items-center justify-between p-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  <span>Data Retention Policies</span>
                  <Eye size={14} />
                </button>
                <button className="w-full flex items-center justify-between p-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  <span>Access Control Matrices</span>
                  <Eye size={14} />
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}
