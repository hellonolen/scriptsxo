"use client";

export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileSignature,
  Send,
  XCircle,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { prescriptions as prescriptionsApi, pharmacies } from "@/lib/api";
import { getSessionCookie } from "@/lib/auth";

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://scriptsxo-api.hellonolen.workers.dev";

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

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

interface SnsDelivery {
  _id: string;
  channel: string;
  status: string;
  sentAt: number;
  deliveredAt?: number;
  error?: string;
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
   Timeline step component
   --------------------------------------------------------------------------- */

interface TimelineStepProps {
  icon: React.ElementType;
  label: string;
  detail?: string;
  done: boolean;
  active?: boolean;
}

function TimelineStep({ icon: Icon, label, detail, done, active }: TimelineStepProps) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          done
            ? "bg-primary/10 text-primary"
            : active
            ? "bg-warning/10 text-warning border-2 border-warning/30"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : active ? (
          <Icon size={14} aria-hidden="true" />
        ) : (
          <Circle size={14} aria-hidden="true" />
        )}
      </div>
      <div className="pt-0.5">
        <p
          className={`text-sm font-medium ${
            done || active ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {detail && (
          <p className="text-xs text-muted-foreground font-light mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function PrescriptionDetailPage() {
  const params = useParams();
  const rxId = params.id as string;
  const session = getSessionCookie();
  const providerEmail = session?.email ?? "";

  const [rx, setRx] = useState<any | null>(null);
  const [deliveries, setDeliveries] = useState<SnsDelivery[]>([]);
  const [pharmacy, setPharmacy] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [signingId, setSigningId] = useState(false);
  const [sendingId, setSendingId] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function loadRx() {
    setLoading(true);
    try {
      const data = await prescriptionsApi.getById(rxId);
      setRx(data);

      if ((data as any).pharmacyId) {
        pharmacies
          .getById((data as any).pharmacyId)
          .then(setPharmacy)
          .catch(() => null);
      }

      const res = await fetch(`${API_BASE}/sns/deliveries/${rxId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json() as { success: boolean; data?: SnsDelivery[] };
        if (json.success && Array.isArray(json.data)) {
          setDeliveries(json.data);
        }
      }
    } catch {
      setRx(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (rxId) loadRx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rxId]);

  async function handleSign() {
    if (!providerEmail) return;
    setSigningId(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await prescriptionsApi.sign(rxId, providerEmail);
      setActionSuccess("Prescription signed successfully.");
      await loadRx();
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to sign prescription.");
    } finally {
      setSigningId(false);
    }
  }

  async function handleSend() {
    if (!rx?.pharmacyId) {
      setActionError("No pharmacy assigned. Edit the prescription to add a pharmacy.");
      return;
    }
    setSendingId(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await prescriptionsApi.sendToPharmacy(rxId, rx.pharmacyId);
      setActionSuccess("Prescription sent to pharmacy.");
      await loadRx();
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to send to pharmacy.");
    } finally {
      setSendingId(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await prescriptionsApi.updateStatus(rxId, "cancelled");
      setActionSuccess("Prescription cancelled.");
      await loadRx();
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to cancel prescription.");
    } finally {
      setCancelling(false);
    }
  }

  const status: RxStatus = rx?.status ?? "draft";
  const isDraft = status === "draft" || status === "pending_review";
  const isSigned = status === "signed";
  const isCancelled = status === "cancelled";

  // Timeline states
  const timelineCreated = Boolean(rx?.createdAt);
  const timelineSigned = Boolean(rx?.signedAt) || ["signed", "sent", "filling", "ready", "picked_up", "delivered"].includes(status);
  const timelineSent = ["sent", "filling", "ready", "picked_up", "delivered"].includes(status);
  const timelineDelivered = deliveries.some((d) => d.status === "delivered" || d.deliveredAt);

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            <span className="text-sm font-light">Loading prescription...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!rx) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10">
          <Link
            href="/provider/prescriptions"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-light mb-8"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Prescriptions
          </Link>
          <p className="text-muted-foreground font-light">Prescription not found.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <Link
            href="/provider/prescriptions"
            className="text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div className="flex-1">
            <p className="eyebrow mb-0.5">PRESCRIPTION DETAIL</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {rx.medicationName}
              </h1>
              <Badge variant={STATUS_VARIANT[status] ?? "default"}>
                {STATUS_LABEL[status] ?? status}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          Written {rx.createdAt ? formatDate(rx.createdAt) : "—"}
          {rx.patientName ? ` for ${rx.patientName}` : ""}
        </p>

        {/* Action banners */}
        {actionError && (
          <div className="mb-6 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 font-light">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="mb-6 px-4 py-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-700 font-light">
            {actionSuccess}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* ── LEFT: Rx Details ── */}
          <div className="space-y-6">
            {/* Medication */}
            <section className="bg-card border border-border rounded-md p-6">
              <h2
                className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Medication
              </h2>
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: "Medication Name", value: rx.medicationName },
                  { label: "Generic Name", value: rx.genericName },
                  { label: "NDC", value: rx.ndc },
                  { label: "Dosage", value: rx.dosage },
                  { label: "Form", value: rx.form },
                  { label: "Quantity", value: rx.quantity },
                  { label: "Days Supply", value: rx.daysSupply },
                  { label: "Refills Authorized", value: rx.refillsAuthorized },
                  { label: "Strength", value: rx.strength },
                  { label: "Base / Vehicle", value: rx.base },
                  {
                    label: "BUD",
                    value: rx.bud ? formatDate(rx.bud) : undefined,
                  },
                  { label: "DEA Schedule", value: rx.deaSchedule === "none" ? "Not Scheduled" : `Schedule ${rx.deaSchedule}` },
                ]
                  .filter((f) => f.value)
                  .map((f) => (
                    <div key={f.label}>
                      <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                        {f.label}
                      </dt>
                      <dd className="text-sm text-foreground font-light">{f.value}</dd>
                    </div>
                  ))}
              </dl>
            </section>

            {/* Directions */}
            {rx.directions && (
              <section className="bg-card border border-border rounded-md p-6">
                <h2
                  className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Sig / Directions
                </h2>
                <p className="text-sm font-light text-foreground leading-relaxed">
                  {rx.directions}
                </p>
              </section>
            )}

            {/* Special Instructions */}
            {rx.specialInstructions && (
              <section className="bg-card border border-border rounded-md p-6">
                <h2
                  className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Special Instructions
                </h2>
                <p className="text-sm font-light text-foreground leading-relaxed">
                  {rx.specialInstructions}
                </p>
              </section>
            )}

            {/* SNS Delivery History */}
            {deliveries.length > 0 && (
              <section className="bg-card border border-border rounded-md p-6">
                <h2
                  className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Delivery History
                </h2>
                <div className="space-y-3">
                  {deliveries.map((d) => (
                    <div
                      key={d._id}
                      className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-light text-foreground capitalize">
                          {d.channel}
                        </p>
                        <p className="text-xs text-muted-foreground font-light mt-0.5">
                          Sent {formatDateTime(d.sentAt)}
                          {d.deliveredAt
                            ? ` · Delivered ${formatDateTime(d.deliveredAt)}`
                            : ""}
                        </p>
                        {d.error && (
                          <p className="text-xs text-destructive/70 font-light mt-0.5">
                            Error: {d.error}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          d.status === "delivered"
                            ? "success"
                            : d.status === "failed"
                            ? "error"
                            : "info"
                        }
                      >
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="space-y-6">
            {/* Patient */}
            <section className="bg-card border border-border rounded-md p-6">
              <h2
                className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Patient
              </h2>
              <dl className="space-y-3">
                {rx.patientName && (
                  <div>
                    <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                      Name
                    </dt>
                    <dd className="text-sm text-foreground font-light">{rx.patientName}</dd>
                  </div>
                )}
                {rx.patientEmail && (
                  <div>
                    <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                      Email
                    </dt>
                    <dd className="text-sm text-foreground font-light">{rx.patientEmail}</dd>
                  </div>
                )}
                {rx.consultationId && (
                  <div>
                    <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                      Consultation
                    </dt>
                    <dd className="text-sm text-foreground font-light font-mono text-xs">
                      {rx.consultationId}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Pharmacy */}
            {pharmacy && (
              <section className="bg-card border border-border rounded-md p-6">
                <h2
                  className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Pharmacy
                </h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                      Name
                    </dt>
                    <dd className="text-sm text-foreground font-light">{(pharmacy as any).name}</dd>
                  </div>
                  {(pharmacy as any).phone && (
                    <div>
                      <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                        Phone
                      </dt>
                      <dd className="text-sm text-foreground font-light">{(pharmacy as any).phone}</dd>
                    </div>
                  )}
                  {(pharmacy as any).fax && (
                    <div>
                      <dt className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-light mb-1">
                        Fax
                      </dt>
                      <dd className="text-sm text-foreground font-light">{(pharmacy as any).fax}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Timeline */}
            <section className="bg-card border border-border rounded-md p-6">
              <h2
                className="text-sm font-medium text-foreground mb-5 pb-2 border-b border-border"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Timeline
              </h2>
              <div className="space-y-5">
                <TimelineStep
                  icon={Clock}
                  label="Created"
                  detail={rx.createdAt ? formatDateTime(rx.createdAt) : undefined}
                  done={timelineCreated}
                />
                <TimelineStep
                  icon={FileSignature}
                  label="Signed"
                  detail={rx.signedAt ? formatDateTime(rx.signedAt) : undefined}
                  done={timelineSigned}
                  active={isDraft}
                />
                <TimelineStep
                  icon={Send}
                  label="Sent to Pharmacy"
                  detail={rx.sentAt ? formatDateTime(rx.sentAt) : undefined}
                  done={timelineSent}
                  active={isSigned}
                />
                <TimelineStep
                  icon={Package}
                  label="Processing"
                  done={["filling", "ready", "picked_up", "delivered"].includes(status)}
                  active={status === "sent"}
                />
                <TimelineStep
                  icon={Truck}
                  label="SNS Delivered"
                  detail={
                    deliveries.find((d) => d.deliveredAt)
                      ? formatDateTime(deliveries.find((d) => d.deliveredAt)!.deliveredAt!)
                      : undefined
                  }
                  done={timelineDelivered}
                />
              </div>
            </section>

            {/* Action Buttons */}
            {!isCancelled && (
              <section className="space-y-3">
                {isDraft && (
                  <button
                    onClick={handleSign}
                    disabled={signingId}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {signingId ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <FileSignature size={13} aria-hidden="true" />
                    )}
                    Sign Prescription
                  </button>
                )}
                {isSigned && (
                  <button
                    onClick={handleSend}
                    disabled={sendingId}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sendingId ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send size={13} aria-hidden="true" />
                    )}
                    Send to Pharmacy
                  </button>
                )}
                {(isDraft || isSigned) && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-red-200 text-red-600 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cancelling ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <XCircle size={13} aria-hidden="true" />
                    )}
                    Cancel Prescription
                  </button>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
