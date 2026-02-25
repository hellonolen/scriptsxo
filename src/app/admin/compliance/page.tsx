"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft, FileCheck, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const PENDING_VERIFICATIONS = [
  { patient: "Amy Thompson", type: "ID Verification", submitted: "10 min ago", document: "Driver's License" },
  { patient: "David Liu", type: "ID Verification", submitted: "25 min ago", document: "Passport" },
];

const RECENT_AUDITS = [
  { action: "Patient record accessed", user: "Dr. Johnson", timestamp: "Feb 12, 2:15 PM", status: "normal" },
  { action: "Prescription signed", user: "Dr. Martinez", timestamp: "Feb 12, 1:45 PM", status: "normal" },
  { action: "Bulk export requested", user: "Admin", timestamp: "Feb 12, 11:30 AM", status: "flagged" },
  { action: "Login from new device", user: "PA Brown", timestamp: "Feb 12, 10:00 AM", status: "normal" },
];

export default function CompliancePage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">ADMINISTRATION</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Compliance
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          ID verifications, audit logs, and HIPAA compliance.
        </p>

        {/* Pending Verifications */}
        <div className="mb-8">
          <h2 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary" aria-hidden="true" />
            Pending Verifications ({PENDING_VERIFICATIONS.length})
          </h2>
          <div className="space-y-3">
            {PENDING_VERIFICATIONS.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <FileCheck size={18} className="text-yellow-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.patient}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.document} -- {item.submitted}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-[5px] hover:bg-primary/90 transition-colors">
                    Approve
                  </button>
                  <button className="px-3 py-1.5 border border-border text-foreground text-xs rounded-[5px] hover:bg-muted transition-colors">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div>
          <h2 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
            Recent Audit Log
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {RECENT_AUDITS.map((audit, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {audit.status === "flagged" ? (
                      <AlertTriangle size={16} className="text-yellow-500" aria-hidden="true" />
                    ) : (
                      <CheckCircle size={16} className="text-green-500" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm text-foreground">{audit.action}</p>
                      <p className="text-xs text-muted-foreground">{audit.user}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{audit.timestamp}</span>
                    {audit.status === "flagged" && <Badge variant="warning">Flagged</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
