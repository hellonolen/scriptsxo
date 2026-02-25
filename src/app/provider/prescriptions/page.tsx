"use client";

import Link from "next/link";
import {
  ArrowLeft,
  FileSignature,
  Eye,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

type RxStatus = "signed" | "pending_review" | "sent" | "filling";

const STATUS_VARIANT: Record<RxStatus, "success" | "warning" | "info" | "default"> = {
  signed: "success",
  pending_review: "warning",
  sent: "info",
  filling: "default",
};

const STATUS_LABEL: Record<RxStatus, string> = {
  signed: "Signed",
  pending_review: "Pending Review",
  sent: "Sent to Pharmacy",
  filling: "Filling",
};

const PRESCRIPTIONS = [
  {
    patient: "Amara Johnson",
    initials: "AJ",
    medication: "Amoxicillin 500mg",
    dosage: "3x daily, 10 days",
    status: "pending_review" as RxStatus,
    prescribed: "Feb 12, 2026",
    refills: 0,
  },
  {
    patient: "Marcus Rivera",
    initials: "MR",
    medication: "Lisinopril 10mg",
    dosage: "1x daily, ongoing",
    status: "signed" as RxStatus,
    prescribed: "Feb 10, 2026",
    refills: 3,
  },
  {
    patient: "Elena Vasquez",
    initials: "EV",
    medication: "Fluconazole 150mg",
    dosage: "Single dose",
    status: "pending_review" as RxStatus,
    prescribed: "Feb 12, 2026",
    refills: 0,
  },
  {
    patient: "David Chen",
    initials: "DC",
    medication: "Metformin 850mg",
    dosage: "2x daily, ongoing",
    status: "sent" as RxStatus,
    prescribed: "Feb 8, 2026",
    refills: 5,
  },
  {
    patient: "Sophia Patel",
    initials: "SP",
    medication: "Sertraline 50mg",
    dosage: "1x daily, ongoing",
    status: "filling" as RxStatus,
    prescribed: "Feb 5, 2026",
    refills: 2,
  },
  {
    patient: "Thomas Grant",
    initials: "TG",
    medication: "Atorvastatin 20mg",
    dosage: "1x daily, ongoing",
    status: "signed" as RxStatus,
    prescribed: "Feb 3, 2026",
    refills: 6,
  },
] as const;

const FILTER_TABS = [
  { label: "All", count: PRESCRIPTIONS.length },
  {
    label: "Pending Review",
    count: PRESCRIPTIONS.filter((rx) => rx.status === "pending_review").length,
  },
  {
    label: "Active",
    count: PRESCRIPTIONS.filter(
      (rx) => rx.status === "signed" || rx.status === "sent" || rx.status === "filling"
    ).length,
  },
  {
    label: "Expired",
    count: 0,
  },
] as const;

export default function ProviderPrescriptionsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/provider" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">PROVIDER PORTAL</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Prescriptions
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          Review, sign, and manage prescription requests.
        </p>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab, index) => (
            <button
              key={tab.label}
              className={`px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm transition-colors whitespace-nowrap ${
                index === 0
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-2 opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Patient
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Medication
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Dosage
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Status
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Prescribed
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Refills
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {PRESCRIPTIONS.map((rx) => (
                <tr key={`${rx.patient}-${rx.medication}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                        {rx.initials}
                      </div>
                      <span className="text-sm font-light text-foreground">
                        {rx.patient}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm font-light text-foreground">
                    {rx.medication}
                  </td>
                  <td className="text-sm font-light text-muted-foreground">
                    {rx.dosage}
                  </td>
                  <td>
                    <Badge variant={STATUS_VARIANT[rx.status]}>
                      {STATUS_LABEL[rx.status]}
                    </Badge>
                  </td>
                  <td className="text-sm font-light text-muted-foreground">
                    {rx.prescribed}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <RefreshCw
                        size={12}
                        className="text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-light text-foreground">
                        {rx.refills}
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rx.status === "pending_review" && (
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                          <FileSignature size={12} aria-hidden="true" />
                          Sign
                        </button>
                      )}
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
                        <Eye size={12} aria-hidden="true" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
