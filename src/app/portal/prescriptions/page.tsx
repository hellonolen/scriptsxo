"use client";

import { useState, useEffect } from "react";
import { Pill, Plus, FileDown, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/* ---------------------------------------------------------------------------
   STATUS TRACKER CONSTANTS
   --------------------------------------------------------------------------- */

const STATUS_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "preparing", label: "Preparing" },
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
] as const;

const COMPLETED_COLOR = "#7C3AED";
const CURRENT_COLOR = "#2DD4BF";
const UPCOMING_COLOR = "#D4D4D8";

function resolveStepIndex(dbStatus: string): number {
  switch (dbStatus) {
    case "draft":
    case "pending_review":
      return 0;
    case "signed":
      return 1;
    case "filling":
      return 2;
    case "sent":
    case "ready":
    case "delivered":
      return 3;
    case "picked_up":
      return 4;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

/* ---------------------------------------------------------------------------
   STATUS TRACKER COMPONENT
   --------------------------------------------------------------------------- */

function StatusTracker({ status }: { status: string }) {
  const currentIndex = resolveStepIndex(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-[9px] tracking-[0.12em] uppercase font-medium px-2.5 py-1"
          style={{ color: "#DC2626", background: "rgba(220, 38, 38, 0.08)" }}
        >
          Cancelled
        </span>
      </div>
    );
  }

  return (
    <div className="w-full" role="group" aria-label="Prescription order status">
      <div className="flex items-center w-full">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const dotColor = isCompleted
            ? COMPLETED_COLOR
            : isCurrent
              ? CURRENT_COLOR
              : UPCOMING_COLOR;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="relative flex items-center justify-center">
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: isCurrent ? 10 : 7,
                    height: isCurrent ? 10 : 7,
                    backgroundColor: dotColor,
                    boxShadow: isCurrent
                      ? `0 0 0 3px rgba(45, 212, 191, 0.18)`
                      : "none",
                  }}
                  aria-hidden="true"
                />
                <span className="sr-only">
                  {step.label}:{" "}
                  {isCompleted ? "completed" : isCurrent ? "current step" : "upcoming"}
                </span>
              </div>

              {index < STATUS_STEPS.length - 1 && (
                <div
                  className="flex-1 mx-1 transition-colors duration-300"
                  style={{
                    height: 2,
                    backgroundColor:
                      index < currentIndex ? COMPLETED_COLOR : UPCOMING_COLOR,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex w-full mt-2">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step.key}
              className="flex-1 last:flex-none"
              style={{ minWidth: index === STATUS_STEPS.length - 1 ? "auto" : undefined }}
            >
              <span
                className="block text-center transition-colors duration-300"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCompleted
                    ? COMPLETED_COLOR
                    : isCurrent
                      ? CURRENT_COLOR
                      : "#A1A1AA",
                  transform: index === 0 ? "translateX(-2px)" : index === STATUS_STEPS.length - 1 ? "translateX(2px)" : undefined,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------------------- */

function getStatusBadge(status: string): { label: string; isActive: boolean } {
  switch (status) {
    case "signed":
    case "sent":
    case "ready":
    case "delivered":
    case "picked_up":
      return { label: "Active", isActive: true };
    case "cancelled":
      return { label: "Cancelled", isActive: false };
    case "filling":
      return { label: "Preparing", isActive: true };
    default:
      return { label: status.replace("_", " "), isActive: false };
  }
}

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function PrescriptionsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setEmail(session.email);
    }
    setSessionChecked(true);
  }, []);

  const patient = useQuery(
    api.patients.getByEmail,
    email ? { email } : "skip"
  );

  const prescriptions = useQuery(
    api.prescriptions.getByPatient,
    patient ? { patientId: patient._id } : "skip"
  );

  const generatePdf = useAction(api.actions.generatePrescriptionPdf.generate);

  const handleDownloadPdf = async (prescriptionId: string) => {
    setDownloading(prescriptionId);
    try {
      await generatePdf({ prescriptionId });
    } catch {
      // Error handling — PDF generation failure is silent to avoid exposing details
    } finally {
      setDownloading(prescriptionId);
      setTimeout(() => setDownloading(null), 1500);
    }
  };

  // Loading state
  if (!sessionChecked || (email !== null && (patient === undefined || prescriptions === undefined))) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1100px]">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const rxList = prescriptions ?? [];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* ---- HEADER ---- */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Pharmacy</p>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your <span className="text-[#7C3AED]">Prescriptions</span>
            </h1>
            <p className="text-sm text-muted-foreground font-light mt-2">
              Managed by ScriptsXO Telehealth
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-[11px] tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity self-start sm:self-auto" style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}>
            <Plus size={14} aria-hidden="true" />
            Request New Prescription
          </button>
        </header>

        {/* ---- PRESCRIPTION LIST ---- */}
        {rxList.length > 0 ? (
          <div className="space-y-4">
            {rxList.map((rx: any) => {
              const badge = getStatusBadge(rx.status);

              return (
                <div key={rx._id} className="glass-card group">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-5">

                    {/* Left: Medication info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 ${
                            badge.isActive
                              ? "text-[#16A34A] bg-[#16A34A]/8"
                              : "text-[#CA8A04] bg-[#CA8A04]/8"
                          }`}
                        >
                          {badge.label}
                        </span>
                        {rx.nextRefillDate && (
                          <span className="text-[10px] text-muted-foreground">
                            Refill {new Date(rx.nextRefillDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                          <Pill size={16} className="text-[#7C3AED]" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="text-lg font-light text-foreground truncate"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {rx.medicationName}
                          </h3>
                          <p className="text-sm text-muted-foreground font-light">
                            {rx.dosage} &middot; {rx.directions}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Form</span>
                          <span className="text-foreground font-light">{rx.form}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Qty</span>
                          <span className="text-foreground font-light">{rx.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Refills</span>
                          <span className="text-foreground font-light">
                            {(rx.refillsAuthorized ?? 0) - (rx.refillsUsed ?? 0)} left
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Tracker */}
                    <div className="lg:w-[320px] shrink-0 pt-1">
                      <p className="text-[9px] tracking-[0.15em] uppercase font-medium text-muted-foreground mb-3">
                        Order Status
                      </p>
                      <StatusTracker status={rx.status} />
                    </div>
                  </div>

                  {/* Actions */}
                  {(rx.status === "signed" || rx.status === "sent" || rx.status === "ready") && (
                    <div className="pt-4 mt-4 border-t border-border flex items-center gap-4">
                      <button
                        onClick={() => handleDownloadPdf(rx._id)}
                        disabled={downloading === rx._id}
                        className="flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase text-muted-foreground hover:text-[#7C3AED] transition-colors disabled:opacity-50"
                      >
                        <FileDown size={12} aria-hidden="true" />
                        {downloading === rx._id ? "Generating..." : "Download PDF"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card text-center py-20">
            <Pill size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              No Prescriptions Yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start a consultation with a provider to receive your first prescription.
            </p>
          </div>
        )}

      </div>
    </AppShell>
  );
}
