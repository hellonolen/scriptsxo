"use client";

import { useState } from "react";
import { Pill, RefreshCw, Plus, FileDown, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

/* ---------------------------------------------------------------------------
   DATA — placeholder until Convex patient data is connected
   --------------------------------------------------------------------------- */

const PRESCRIPTIONS = [
  {
    name: "Tretinoin Cream",
    strength: "0.025%",
    directions: "Apply nightly",
    status: "Active" as const,
    refillDate: "Mar 8",
    screening: "AI-screened",
    pharmacy: "Alto Pharmacy",
    faxStatus: "Sent",
  },
  {
    name: "Spironolactone",
    strength: "50mg",
    directions: "Once daily",
    status: "Active" as const,
    refillDate: "Mar 22",
    screening: "AI-screened",
    pharmacy: "Alto Pharmacy",
    faxStatus: "Confirmed",
  },
  {
    name: "Finasteride",
    strength: "1mg",
    directions: "Once daily",
    status: "Pending review" as const,
    refillDate: "Feb 28",
    screening: "AI screening in progress",
    pharmacy: "—",
    faxStatus: "—",
  },
] as const;

/* ---------------------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------------------- */

function statusClasses(status: string) {
  if (status === "Active") return "text-[#16A34A] bg-[#16A34A]/8";
  if (status === "Pending review") return "text-[#CA8A04] bg-[#CA8A04]/8";
  return "text-muted-foreground bg-muted";
}

function faxBadgeVariant(status: string) {
  if (status === "Sent") return "info" as const;
  if (status === "Confirmed") return "success" as const;
  return "secondary" as const;
}

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function PrescriptionsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadPdf = async (rxName: string) => {
    setDownloading(rxName);
    // TODO: Connect to Convex action api.actions.generatePrescriptionPdf.generate
    // once patient auth provides a real prescriptionId
    setTimeout(() => setDownloading(null), 1500);
  };

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

        {/* ---- PRESCRIPTION GRID ---- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESCRIPTIONS.map((rx) => (
            <div key={rx.name} className="glass-card group">
              {/* Status + Refill */}
              <div className="flex items-center justify-between mb-5">
                <span
                  className={`text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 ${statusClasses(rx.status)}`}
                >
                  {rx.status}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Refill {rx.refillDate}
                </span>
              </div>

              {/* Medication name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                  <Pill size={16} className="text-[#7C3AED]" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    className="text-lg font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {rx.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-light">
                    {rx.strength} &middot; {rx.directions}
                  </p>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Screening</span>
                  <span className="text-foreground font-light">{rx.screening}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Pharmacy</span>
                  <span className="text-foreground font-light">{rx.pharmacy}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Fax Status</span>
                  {rx.faxStatus !== "—" ? (
                    <Badge variant={faxBadgeVariant(rx.faxStatus)} className="text-[9px] px-2 py-0.5">
                      {rx.faxStatus}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/50 font-light">—</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border flex items-center gap-4">
                {rx.status === "Active" && (
                  <>
                    <button
                      onClick={() => handleDownloadPdf(rx.name)}
                      disabled={downloading === rx.name}
                      className="flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase text-muted-foreground hover:text-[#7C3AED] transition-colors disabled:opacity-50"
                    >
                      <FileDown size={12} aria-hidden="true" />
                      {downloading === rx.name ? "Generating..." : "Download PDF"}
                    </button>
                    <button className="flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase text-muted-foreground group-hover:text-[#7C3AED] transition-colors">
                      <RefreshCw size={12} aria-hidden="true" />
                      Request Refill
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
