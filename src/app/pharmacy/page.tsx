"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Clock,
  Package,
  CheckCircle,
  Truck,
  Pill,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { term } from "@/lib/config";

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

function mapDbStatusToFill(status: string): FillStatus {
  switch (status) {
    case "sent": return "queued";
    case "filling": return "filling";
    case "ready": return "ready";
    case "signed": return "verification";
    default: return "queued";
  }
}

function mapDbPriority(deaSchedule: string | undefined): RxPriority {
  if (!deaSchedule) return "normal";
  if (deaSchedule === "II" || deaSchedule === "III") return "stat";
  if (deaSchedule === "IV") return "high";
  return "normal";
}

function getInitials(id: string): string {
  return id.toString().slice(-2).toUpperCase();
}

export default function PharmacyPage() {
  const prescriptions = useQuery(api.prescriptions.listAll, { status: "sent" });
  const fillingRx = useQuery(api.prescriptions.listAll, { status: "filling" });
  const readyRx = useQuery(api.prescriptions.listAll, { status: "ready" });
  const deliveredRx = useQuery(api.prescriptions.listAll, { status: "picked_up" });
  const signedRx = useQuery(api.prescriptions.listAll, { status: "signed" });

  const inQueue = prescriptions?.length ?? 0;
  const filling = fillingRx?.length ?? 0;
  const ready = readyRx?.length ?? 0;
  const delivered = deliveredRx?.length ?? 0;

  // Combine queued + filling + verification prescriptions for the main table
  const queueData = [
    ...(prescriptions ?? []),
    ...(fillingRx ?? []),
    ...(signedRx ?? []),
  ];

  // Remove duplicates by _id
  const seen = new Set<string>();
  const allQueueItems = queueData.filter((rx: any) => {
    if (seen.has(rx._id)) return false;
    seen.add(rx._id);
    return true;
  });

  const isLoading = prescriptions === undefined && fillingRx === undefined;

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
          {[
            { label: "In Queue", value: prescriptions === undefined ? "—" : String(inQueue), icon: Clock },
            { label: "Filling", value: fillingRx === undefined ? "—" : String(filling), icon: Package },
            { label: "Ready", value: readyRx === undefined ? "—" : String(ready), icon: CheckCircle },
            { label: "Delivered Today", value: deliveredRx === undefined ? "—" : String(delivered), icon: Truck },
          ].map((stat) => (
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
              {isLoading ? "Loading..." : `${allQueueItems.length} prescriptions`}
            </span>
          </div>

          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">{term("title")}</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Medication</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Dosage</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Priority</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Status</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
                    </td>
                  </tr>
                ) : allQueueItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <p className="text-sm text-muted-foreground">No prescriptions in queue.</p>
                    </td>
                  </tr>
                ) : (
                  allQueueItems.map((rx: any) => {
                    const fillStatus = mapDbStatusToFill(rx.status);
                    const priority = mapDbPriority(rx.deaSchedule);

                    return (
                      <tr key={rx._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                              {getInitials(rx.patientId ?? rx._id)}
                            </div>
                            <span className="text-sm font-light text-foreground">
                              Patient
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Pill size={13} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
                            <span className="text-sm font-light text-foreground">{rx.medicationName}</span>
                          </div>
                        </td>
                        <td className="text-sm font-light text-muted-foreground">{rx.dosage}</td>
                        <td>
                          <Badge variant={PRIORITY_VARIANT[priority]}>
                            {priority === "stat" && (
                              <AlertCircle size={10} className="mr-1" aria-hidden="true" />
                            )}
                            {priority}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={FILL_STATUS_VARIANT[fillStatus]}>
                            {FILL_STATUS_LABEL[fillStatus]}
                          </Badge>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {fillStatus === "queued" && (
                              <button className="px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                                Fill
                              </button>
                            )}
                            {fillStatus === "filling" && (
                              <button className="px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                                Ready
                              </button>
                            )}
                            {(fillStatus === "ready" || fillStatus === "verification") && (
                              <button className="px-5 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
                                Details
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
