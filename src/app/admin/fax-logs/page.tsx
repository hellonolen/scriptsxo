"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ArrowLeft,
  Search,
  RefreshCw,
  Phone,
} from "lucide-react";
import Link from "next/link";

function faxStatusVariant(status: string) {
  switch (status) {
    case "queued": return "secondary" as const;
    case "sending": return "info" as const;
    case "sent": return "success" as const;
    case "failed": return "error" as const;
    case "confirmed": return "success" as const;
    default: return "secondary" as const;
  }
}

export default function AdminFaxLogsPage() {
  const faxLogs = useQuery(api.faxLogs.list, {});
  const sendFax = useAction(api.actions.sendFax.send);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const filtered = (faxLogs ?? []).filter((log) => {
    return statusFilter === "all" || log.status === statusFilter;
  });

  const handleRetry = async (log: { prescriptionId: string; pharmacyId: string; _id: string }) => {
    setRetrying(log._id);
    try {
      await sendFax({
        prescriptionId: log.prescriptionId as any,
        pharmacyId: log.pharmacyId as any,
      });
    } catch (err) {
      console.error("Fax retry failed:", err);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
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
                Fax Logs
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {faxLogs?.length ?? 0} fax records
              </p>
            </div>
          </div>
        </header>

        {/* Filter */}
        <div className="flex gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>

        {/* Fax Logs Table */}
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[150px_1fr_150px_100px_80px_100px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
            <span>Date</span>
            <span>Fax Number</span>
            <span>Phaxio ID</span>
            <span>Status</span>
            <span>Attempts</span>
            <span>Actions</span>
          </div>

          {!faxLogs && (
            <div className="p-12 text-center text-muted-foreground font-light">
              Loading fax logs...
            </div>
          )}

          {faxLogs && filtered.length === 0 && (
            <div className="p-12 text-center">
              <Phone size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-light">No fax logs found.</p>
            </div>
          )}

          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div
                key={log._id}
                className="grid grid-cols-1 md:grid-cols-[150px_1fr_150px_100px_80px_100px] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
              >
                <span className="text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-foreground font-mono">{log.faxNumber}</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{log.phaxioFaxId || "\u2014"}</span>
                <Badge variant={faxStatusVariant(log.status)}>
                  {log.status}
                </Badge>
                <span className="text-sm text-muted-foreground text-center">{log.attempts}</span>
                <div>
                  {log.status === "failed" && (
                    <button
                      onClick={() => handleRetry(log as any)}
                      disabled={retrying === log._id}
                      className="inline-flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={retrying === log._id ? "animate-spin" : ""} />
                      Retry
                    </button>
                  )}
                  {log.errorMessage && (
                    <p className="text-[10px] text-destructive/70 mt-1 truncate max-w-[150px]" title={log.errorMessage}>
                      {log.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
