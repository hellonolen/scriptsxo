"use client";

export const runtime = "edge";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/config";
import {
  ArrowLeft,
  Pill,
  Shield,
  Calendar,
  DollarSign,
  Activity,
  RefreshCw,
  Stethoscope,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";

// -- Status badge mapping for verification --
const VERIFICATION_VARIANT = {
  verified: "success",
  pending: "info",
  rejected: "error",
} as const;

function getVerificationVariant(status: string) {
  return (
    VERIFICATION_VARIANT[status as keyof typeof VERIFICATION_VARIANT] ??
    "secondary"
  );
}

// -- Status badge mapping for prescriptions --
function getRxVariant(status: string) {
  switch (status) {
    case "signed":
    case "sent":
    case "picked_up":
    case "delivered":
      return "success" as const;
    case "pending_review":
    case "draft":
      return "info" as const;
    case "cancelled":
      return "error" as const;
    case "filling":
    case "ready":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

// -- Status badge mapping for consultations --
function getConsultVariant(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "scheduled":
    case "waiting":
      return "info" as const;
    case "in_progress":
      return "default" as const;
    case "cancelled":
    case "no_show":
      return "error" as const;
    default:
      return "secondary" as const;
  }
}

// -- Status badge mapping for billing --
function getBillingVariant(status: string) {
  switch (status) {
    case "paid":
      return "success" as const;
    case "pending":
    case "submitted":
      return "info" as const;
    case "denied":
      return "error" as const;
    case "appealed":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// -- Loading skeleton for the full page --
function ClientDetailSkeleton() {
  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-4 w-24 mb-3" variant="text" />
        <Skeleton className="h-8 w-64 mb-2" variant="text" />
        <div className="flex gap-3 mt-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <Skeleton className="h-3 w-20 mb-3" variant="text" />
            <Skeleton className="h-7 w-12" variant="text" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <Skeleton className="h-6 w-40 mb-4" variant="text" />
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-border last:border-b-0">
            <Skeleton className="h-4 w-full" variant="text" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const patientId = params.id as Id<"patients">;

  const record = useQuery(api.patients.getFullRecord, { patientId });

  if (!record) {
    return (
      <AppShell>
        <ClientDetailSkeleton />
      </AppShell>
    );
  }

  const { patient, prescriptions, consultations, billing, stats } = record;

  const STAT_CARDS = [
    {
      label: "Active Rx",
      value: stats.activeRxCount,
      icon: Pill,
    },
    {
      label: "Total Refills",
      value: stats.totalRefills,
      icon: RefreshCw,
    },
    {
      label: "Consultations",
      value: stats.lifetimeConsultations,
      icon: Stethoscope,
    },
    {
      label: "Total Spent",
      value: formatPrice(stats.totalSpent),
      icon: DollarSign,
    },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Back + Header */}
        <header className="mb-8">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to Clients
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Client Record</p>
              <h1
                className="text-2xl lg:text-3xl font-light text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {patient.email}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <Badge variant={getVerificationVariant(patient.idVerificationStatus)}>
                  <Shield size={10} aria-hidden="true" />
                  {patient.idVerificationStatus}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {patient.state}
                </span>
                <span className="text-xs text-muted-foreground">
                  Member since {formatDate(stats.memberSince)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STAT_CARDS.map((stat) => (
            <div key={stat.label} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon
                  size={14}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
                  {stat.label}
                </span>
              </div>
              <p
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Prescriptions Table */}
        <section className="mb-10">
          <h2
            className="text-lg font-light text-foreground tracking-tight mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <Pill size={18} className="text-primary" aria-hidden="true" />
            Prescriptions
          </h2>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-[1fr_100px_90px_70px_120px_120px_90px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              <span>Medication</span>
              <span>Dosage</span>
              <span>Form</span>
              <span>Qty</span>
              <span>Refills</span>
              <span>Next Refill</span>
              <span>Status</span>
            </div>

            {prescriptions.length === 0 && (
              <div className="p-8 text-center text-muted-foreground font-light text-sm">
                No prescriptions on file.
              </div>
            )}

            <div className="divide-y divide-border">
              {prescriptions.map((rx) => (
                <div
                  key={rx._id}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_100px_90px_70px_120px_120px_90px] gap-2 lg:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {rx.medicationName}
                    </p>
                    {rx.genericName && (
                      <p className="text-[11px] text-muted-foreground">
                        {rx.genericName}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-foreground">{rx.dosage}</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {rx.form}
                  </span>
                  <span className="text-sm text-foreground">{rx.quantity}</span>
                  <span className="text-sm text-muted-foreground">
                    {rx.refillsUsed}/{rx.refillsAuthorized}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(rx.nextRefillDate)}
                  </span>
                  <Badge variant={getRxVariant(rx.status)}>{rx.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Consultations */}
        <section className="mb-10">
          <h2
            className="text-lg font-light text-foreground tracking-tight mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <Stethoscope size={18} className="text-primary" aria-hidden="true" />
            Consultations
          </h2>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[120px_1fr_120px_1fr] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              <span>Type</span>
              <span>Date</span>
              <span>Status</span>
              <span>Diagnosis</span>
            </div>

            {consultations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground font-light text-sm">
                No consultations on file.
              </div>
            )}

            <div className="divide-y divide-border">
              {consultations.map((consult) => (
                <div
                  key={consult._id}
                  className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px_1fr] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <span className="text-sm text-foreground capitalize">
                    {consult.type}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(consult.scheduledAt)}
                  </span>
                  <Badge variant={getConsultVariant(consult.status)}>
                    {consult.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {consult.diagnosis || "--"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Billing */}
        <section className="mb-10">
          <h2
            className="text-lg font-light text-foreground tracking-tight mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <CreditCard size={18} className="text-primary" aria-hidden="true" />
            Billing
          </h2>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[120px_1fr_120px_120px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              <span>Type</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Date</span>
            </div>

            {billing.length === 0 && (
              <div className="p-8 text-center text-muted-foreground font-light text-sm">
                No billing records on file.
              </div>
            )}

            <div className="divide-y divide-border">
              {billing.map((record) => (
                <div
                  key={record._id}
                  className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px_120px] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <span className="text-sm text-foreground capitalize">
                    {record.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formatPrice(record.amount)}
                  </span>
                  <Badge variant={getBillingVariant(record.status)}>
                    {record.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(record.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
