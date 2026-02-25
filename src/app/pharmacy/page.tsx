"use client";

import {
  Clock,
  Package,
  CheckCircle,
  Truck,
  Pill,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { term } from "@/lib/config";

const STATS = [
  { label: "In Queue", value: "12", icon: Clock },
  { label: "Filling", value: "8", icon: Package },
  { label: "Ready", value: "15", icon: CheckCircle },
  { label: "Delivered Today", value: "3", icon: Truck },
] as const;

type RxPriority = "stat" | "high" | "normal";
type FillStatus = "queued" | "filling" | "ready" | "verification";

const PRIORITY_VARIANT: Record<RxPriority, "error" | "warning" | "info"> = {
  stat: "error",
  high: "warning",
  normal: "info",
};

const FILL_STATUS_VARIANT: Record<FillStatus, "default" | "warning" | "success" | "info"> = {
  queued: "default",
  filling: "warning",
  ready: "success",
  verification: "info",
};

const FILL_STATUS_LABEL: Record<FillStatus, string> = {
  queued: "Queued",
  filling: "Filling",
  ready: "Ready for Pickup",
  verification: "Verification",
};

const QUEUE_PRESCRIPTIONS = [
  {
    patient: "Amara Johnson",
    initials: "AJ",
    medication: "Amoxicillin 500mg",
    dosage: "30 capsules",
    provider: "Dr. Mitchell",
    priority: "high" as RxPriority,
    status: "queued" as FillStatus,
  },
  {
    patient: "Marcus Rivera",
    initials: "MR",
    medication: "Lisinopril 10mg",
    dosage: "90 tablets",
    provider: "Dr. Mitchell",
    priority: "normal" as RxPriority,
    status: "filling" as FillStatus,
  },
  {
    patient: "Elena Vasquez",
    initials: "EV",
    medication: "Fluconazole 150mg",
    dosage: "1 tablet",
    provider: "Dr. Mitchell",
    priority: "stat" as RxPriority,
    status: "queued" as FillStatus,
  },
  {
    patient: "David Chen",
    initials: "DC",
    medication: "Metformin 850mg",
    dosage: "60 tablets",
    provider: "Dr. Pham",
    priority: "normal" as RxPriority,
    status: "verification" as FillStatus,
  },
  {
    patient: "Sophia Patel",
    initials: "SP",
    medication: "Sertraline 50mg",
    dosage: "30 tablets",
    provider: "Dr. Wells",
    priority: "normal" as RxPriority,
    status: "ready" as FillStatus,
  },
  {
    patient: "Thomas Grant",
    initials: "TG",
    medication: "Atorvastatin 20mg",
    dosage: "90 tablets",
    provider: "Dr. Mitchell",
    priority: "normal" as RxPriority,
    status: "filling" as FillStatus,
  },
] as const;

export default function PharmacyPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="mb-10">
          <p className="eyebrow mb-0.5">PHARMACY</p>
          <h1
            className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pharmacy Portal
          </h1>
          <p className="text-muted-foreground font-light mt-1">
            Manage incoming prescriptions and fulfillment workflow.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="glass-card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="stat-label">{stat.label}</span>
                <stat.icon
                  size={16}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="stat-value">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Prescription Queue */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-lg font-medium text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Prescription Queue
            </h2>
            <span className="text-xs text-muted-foreground tracking-widest uppercase font-light">
              {QUEUE_PRESCRIPTIONS.length} prescriptions
            </span>
          </div>

          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">{term("title")}</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Medication</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Dosage</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Provider</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Priority</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Status</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {QUEUE_PRESCRIPTIONS.map((rx) => (
                  <tr key={`${rx.patient}-${rx.medication}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                          {rx.initials}
                        </div>
                        <span className="text-sm font-light text-foreground">{rx.patient}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Pill size={13} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm font-light text-foreground">{rx.medication}</span>
                      </div>
                    </td>
                    <td className="text-sm font-light text-muted-foreground">{rx.dosage}</td>
                    <td className="text-sm font-light text-muted-foreground">{rx.provider}</td>
                    <td>
                      <Badge variant={PRIORITY_VARIANT[rx.priority]}>
                        {rx.priority === "stat" && (
                          <AlertCircle size={10} className="mr-1" aria-hidden="true" />
                        )}
                        {rx.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={FILL_STATUS_VARIANT[rx.status]}>
                        {FILL_STATUS_LABEL[rx.status]}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rx.status === "queued" && (
                          <button className="px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                            Fill
                          </button>
                        )}
                        {rx.status === "filling" && (
                          <button className="px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                            Ready
                          </button>
                        )}
                        {(rx.status === "ready" || rx.status === "verification") && (
                          <button className="px-5 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
