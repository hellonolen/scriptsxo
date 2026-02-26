"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";
import {
  ArrowLeft,
  FileSignature,
  Eye,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

/* ---------------------------------------------------------------------------
   Types & constants
   --------------------------------------------------------------------------- */

type RxStatus =
  | "draft"
  | "signed"
  | "pending_review"
  | "sent"
  | "filling"
  | "ready"
  | "picked_up"
  | "delivered"
  | "cancelled";

const STATUS_VARIANT: Record<
  RxStatus,
  "success" | "warning" | "info" | "default" | "error"
> = {
  draft: "default",
  signed: "success",
  pending_review: "warning",
  sent: "info",
  filling: "default",
  ready: "success",
  picked_up: "success",
  delivered: "success",
  cancelled: "error",
};

const STATUS_LABEL: Record<RxStatus, string> = {
  draft: "Draft",
  signed: "Signed",
  pending_review: "Pending Review",
  sent: "Sent to Pharmacy",
  filling: "Filling",
  ready: "Ready",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

type FilterTab = "All" | "Pending Review" | "Active" | "Expired";

/* ---------------------------------------------------------------------------
   Helper — format a timestamp as a readable date
   --------------------------------------------------------------------------- */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function ProviderPrescriptionsPage() {
  const session = getSessionCookie();
  const providerEmail = session?.email;

  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Query real prescriptions from Convex
  const prescriptions = useQuery(
    api.prescriptions.getByProviderEmail,
    providerEmail ? { providerEmail } : "skip"
  );

  const signForProvider = useMutation(api.prescriptions.signForProvider);

  // Filter prescriptions by tab
  const now = Date.now();
  const filtered = (prescriptions ?? []).filter((rx) => {
    if (activeTab === "All") return true;
    if (activeTab === "Pending Review") {
      return rx.status === "pending_review" || rx.status === "draft";
    }
    if (activeTab === "Active") {
      return (
        rx.status === "signed" ||
        rx.status === "sent" ||
        rx.status === "filling" ||
        rx.status === "ready"
      );
    }
    if (activeTab === "Expired") {
      return rx.status === "cancelled" || (rx.expiresAt && rx.expiresAt < now);
    }
    return true;
  });

  // Tab counts from real data
  const counts = {
    All: (prescriptions ?? []).length,
    "Pending Review": (prescriptions ?? []).filter(
      (rx) => rx.status === "pending_review" || rx.status === "draft"
    ).length,
    Active: (prescriptions ?? []).filter(
      (rx) =>
        rx.status === "signed" ||
        rx.status === "sent" ||
        rx.status === "filling" ||
        rx.status === "ready"
    ).length,
    Expired: (prescriptions ?? []).filter(
      (rx) => rx.status === "cancelled" || (rx.expiresAt && rx.expiresAt < now)
    ).length,
  };

  async function handleSign(prescriptionId: string) {
    if (!providerEmail) return;
    setSigningId(prescriptionId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await signForProvider({
        prescriptionId: prescriptionId as any,
        providerEmail,
      });
      setSuccessMsg("Prescription signed successfully.");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to sign prescription.");
    } finally {
      setSigningId(null);
    }
  }

  const tabs: FilterTab[] = ["All", "Pending Review", "Active", "Expired"];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/provider"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
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

        {/* Error / success banners */}
        {errorMsg && (
          <div className="mb-6 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 font-light">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 px-4 py-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-700 font-light">
            {successMsg}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab}
              <span className="ml-2 opacity-60">{counts[tab]}</span>
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
              {prescriptions === undefined ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-sm text-muted-foreground font-light"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Loading prescriptions...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-sm text-muted-foreground font-light"
                  >
                    No prescriptions yet
                  </td>
                </tr>
              ) : (
                filtered.map((rx) => (
                  <tr key={rx._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                          {rx.patientInitials ?? "??"}
                        </div>
                        <span className="text-sm font-light text-foreground">
                          {rx.patientName ?? "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm font-light text-foreground">
                      {rx.medicationName}
                    </td>
                    <td className="text-sm font-light text-muted-foreground">
                      {rx.dosage}
                    </td>
                    <td>
                      <Badge
                        variant={
                          STATUS_VARIANT[rx.status as RxStatus] ?? "default"
                        }
                      >
                        {STATUS_LABEL[rx.status as RxStatus] ?? rx.status}
                      </Badge>
                    </td>
                    <td className="text-sm font-light text-muted-foreground">
                      {formatDate(rx.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <RefreshCw
                          size={12}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-light text-foreground">
                          {rx.refillsAuthorized - rx.refillsUsed} / {rx.refillsAuthorized}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(rx.status === "pending_review" || rx.status === "draft") && (
                          <button
                            onClick={() => handleSign(rx._id)}
                            disabled={signingId === rx._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {signingId === rx._id ? (
                              <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                            ) : (
                              <FileSignature size={12} aria-hidden="true" />
                            )}
                            Sign
                          </button>
                        )}
                        {rx.status === "signed" && (
                          <button
                            disabled={sendingId === rx._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {sendingId === rx._id ? (
                              <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                            ) : (
                              <Send size={11} aria-hidden="true" />
                            )}
                            Send to Pharmacy
                          </button>
                        )}
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
                          <Eye size={12} aria-hidden="true" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
