"use client";

import { useState, useEffect } from "react";
import { prescriptions as prescriptionsApi, fax } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  ArrowLeft,
  Search,
  FileDown,
  Send,
} from "lucide-react";
import Link from "next/link";

function rxStatusVariant(status: string) {
  switch (status) {
    case "signed": return "success" as const;
    case "sent": return "info" as const;
    case "draft": return "secondary" as const;
    case "pending_review": return "warning" as const;
    case "filling": return "info" as const;
    case "ready": return "success" as const;
    case "picked_up":
    case "delivered": return "default" as const;
    case "cancelled": return "error" as const;
    default: return "secondary" as const;
  }
}

export default function AdminPrescriptionsPage() {
  const [rxList, setRxList] = useState<any[] | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [sendingFax, setSendingFax] = useState<string | null>(null);

  useEffect(() => {
    prescriptionsApi.getByProvider("all")
      .then((data) => setRxList(Array.isArray(data) ? data : []))
      .catch(() => setRxList([]));
  }, []);

  const filtered = (rxList ?? []).filter((rx: any) => {
    const matchesSearch =
      !searchTerm ||
      (rx.medicationName ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleGeneratePdf = async (prescriptionId: string) => {
    setGeneratingPdf(prescriptionId);
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
      const token = document.cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/)?.[1];
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${decodeURIComponent(token)}`;

      const res = await fetch(`${API_BASE}/prescriptions/${prescriptionId}/pdf`, {
        method: "POST",
        headers,
        credentials: "include",
        body: "{}",
      });
      const json = await res.json() as { success: boolean; data?: { url?: string } };
      if (json.data?.url) {
        window.open(json.data.url, "_blank");
      }
    } catch {
      // silently fail
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleSendFax = async (prescriptionId: string, pharmacyId: string, pharmacyFaxNumber: string) => {
    setSendingFax(prescriptionId);
    try {
      await fax.send(prescriptionId, pharmacyId, pharmacyFaxNumber, "");
    } catch {
      // silently fail
    } finally {
      setSendingFax(null);
    }
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <p className="eyebrow mb-1">Administration</p>
              <h1
                className="text-2xl lg:text-3xl font-light text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Prescriptions
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {rxList?.length ?? 0} total prescriptions
              </p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by medication name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="signed">Signed</option>
            <option value="sent">Sent</option>
            <option value="filling">Filling</option>
            <option value="ready">Ready</option>
            <option value="picked_up">Picked Up</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Prescriptions Table */}
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_80px_100px_140px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
            <span>Medication</span>
            <span>Dosage</span>
            <span>Quantity</span>
            <span>Refills</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {!rxList && (
            <div className="p-12 text-left text-muted-foreground font-light">
              Loading prescriptions...
            </div>
          )}

          {rxList && filtered.length === 0 && (
            <div className="p-12 text-left text-muted-foreground font-light">
              No prescriptions found.
            </div>
          )}

          <div className="divide-y divide-border">
            {filtered.map((rx: any) => (
              <div
                key={rx._id}
                className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_80px_100px_140px] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                    <Pill size={14} className="text-[#7C3AED]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{rx.medicationName}</p>
                    <p className="text-[11px] text-muted-foreground">{rx.form} | {rx.directions}</p>
                  </div>
                </div>
                <span className="text-sm text-foreground">{rx.dosage}</span>
                <span className="text-sm text-muted-foreground">{rx.quantity}</span>
                <span className="text-sm text-muted-foreground">{rx.refillsUsed}/{rx.refillsAuthorized}</span>
                <Badge variant={rxStatusVariant(rx.status)}>
                  {rx.status.replace("_", " ")}
                </Badge>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGeneratePdf(rx._id)}
                    disabled={generatingPdf === rx._id}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Generate PDF"
                  >
                    <FileDown size={15} />
                  </button>
                  {rx.pharmacyId && rx.status === "signed" && (
                    <button
                      onClick={() => handleSendFax(rx._id, rx.pharmacyId, rx.pharmacyFaxNumber ?? "")}
                      disabled={sendingFax === rx._id}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="Send Fax to Pharmacy"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Count info */}
        {filtered.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-4 font-light">
            Showing {filtered.length} of {rxList?.length ?? 0} prescriptions
          </p>
        )}
      </div>
    </AppShell>
  );
}
