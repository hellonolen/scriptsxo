"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";
import { prescriptions as prescriptionsApi } from "@/lib/api";
import {
  ArrowLeft,
  FileSignature,
  Eye,
  RefreshCw,
  Send,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://scriptsxo-api.hellonolen.workers.dev";

function getAuthHeaders(): Record<string, string> {
  if (typeof document === "undefined") return { "Content-Type": "application/json" };
  const match = document.cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

// Send-to-pharmacy modal state
interface SendModalState {
  rxId: string;
  pharmacyId: string;
  channel: "email" | "sms" | "fax";
}

function ProviderPrescriptionsContent() {
  const session = getSessionCookie();
  const providerEmail = session?.email;
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rxList, setRxList] = useState<any[] | undefined>(undefined);
  const [sendModal, setSendModal] = useState<SendModalState | null>(null);
  const [snsSentIds, setSnsSentIds] = useState<Set<string>>(new Set());

  // Show success toast if redirected from new Rx form
  useEffect(() => {
    if (searchParams.get("created") === "1") {
      setSuccessMsg("Prescription saved as draft.");
    }
  }, [searchParams]);

  async function loadRxList() {
    if (!providerEmail) return;
    try {
      const data = await prescriptionsApi.getByProvider(providerEmail);
      setRxList(Array.isArray(data) ? data : []);
    } catch {
      setRxList([]);
    }
  }

  useEffect(() => {
    loadRxList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerEmail]);

  // Filter prescriptions by tab
  const now = Date.now();
  const filtered = (rxList ?? []).filter((rx: any) => {
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
    All: (rxList ?? []).length,
    "Pending Review": (rxList ?? []).filter(
      (rx: any) => rx.status === "pending_review" || rx.status === "draft"
    ).length,
    Active: (rxList ?? []).filter(
      (rx: any) =>
        rx.status === "signed" ||
        rx.status === "sent" ||
        rx.status === "filling" ||
        rx.status === "ready"
    ).length,
    Expired: (rxList ?? []).filter(
      (rx: any) => rx.status === "cancelled" || (rx.expiresAt && rx.expiresAt < now)
    ).length,
  };

  async function handleSign(prescriptionId: string) {
    if (!providerEmail) return;
    setSigningId(prescriptionId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await prescriptionsApi.sign(prescriptionId, providerEmail);
      setSuccessMsg("Prescription signed successfully.");
      await loadRxList();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to sign prescription.");
    } finally {
      setSigningId(null);
    }
  }

  async function handleSendToPharmacy() {
    if (!sendModal) return;
    setSendingId(sendModal.rxId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Use SNS delivery endpoint
      const res = await fetch(`${API_BASE}/sns/send`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          prescriptionId: sendModal.rxId,
          pharmacyId: sendModal.pharmacyId || undefined,
          channel: sendModal.channel,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to send.");
      setSnsSentIds((prev) => new Set(prev).add(sendModal.rxId));
      setSuccessMsg("Prescription sent to pharmacy via SNS.");
      setSendModal(null);
      await loadRxList();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to send to pharmacy.");
    } finally {
      setSendingId(null);
    }
  }

  const tabs: FilterTab[] = ["All", "Pending Review", "Active", "Expired"];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
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
          <Link
            href="/provider/rx/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors shrink-0"
          >
            <Plus size={12} aria-hidden="true" />
            Write New Rx
          </Link>
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
              {rxList === undefined ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-left py-10 text-sm text-muted-foreground font-light"
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
                    className="text-left py-10 text-sm text-muted-foreground font-light"
                  >
                    No prescriptions yet
                  </td>
                </tr>
              ) : (
                filtered.map((rx: any) => (
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            STATUS_VARIANT[rx.status as RxStatus] ?? "default"
                          }
                        >
                          {STATUS_LABEL[rx.status as RxStatus] ?? rx.status}
                        </Badge>
                        {snsSentIds.has(rx._id) && (
                          <Badge variant="info">SNS Sent</Badge>
                        )}
                      </div>
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
                            onClick={() =>
                              setSendModal({
                                rxId: rx._id,
                                pharmacyId: rx.pharmacyId ?? "",
                                channel: "email",
                              })
                            }
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
                        <Link
                          href={`/provider/rx/${rx._id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                        >
                          <Eye size={12} aria-hidden="true" />
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send to Pharmacy Modal */}
      {sendModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSendModal(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-md p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2
                  className="text-base font-medium text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send to Pharmacy
                </h2>
                <button
                  onClick={() => setSendModal(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="sendChannel"
                    className="block text-xs tracking-wide text-muted-foreground mb-2 font-medium"
                  >
                    Delivery Channel
                  </label>
                  <select
                    id="sendChannel"
                    value={sendModal.channel}
                    onChange={(e) =>
                      setSendModal((prev) =>
                        prev ? { ...prev, channel: e.target.value as "email" | "sms" | "fax" } : prev
                      )
                    }
                    className="w-full px-4 py-3 bg-white border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="fax">Fax</option>
                  </select>
                </div>

                {!sendModal.pharmacyId && (
                  <div>
                    <label
                      htmlFor="sendPharmacyId"
                      className="block text-xs tracking-wide text-muted-foreground mb-2 font-medium"
                    >
                      Pharmacy ID
                    </label>
                    <input
                      id="sendPharmacyId"
                      type="text"
                      placeholder="Enter pharmacy ID"
                      value={sendModal.pharmacyId}
                      onChange={(e) =>
                        setSendModal((prev) =>
                          prev ? { ...prev, pharmacyId: e.target.value } : prev
                        )
                      }
                      className="w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light"
                    />
                  </div>
                )}

                {errorMsg && (
                  <p className="text-xs text-destructive/70 font-light">{errorMsg}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSendToPharmacy}
                    disabled={sendingId === sendModal.rxId}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sendingId === sendModal.rxId ? (
                      <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send size={11} aria-hidden="true" />
                    )}
                    Send
                  </button>
                  <button
                    onClick={() => setSendModal(null)}
                    className="flex-1 inline-flex items-center justify-center px-5 py-3 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default function ProviderPrescriptionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>}>
      <ProviderPrescriptionsContent />
    </Suspense>
  );
}
