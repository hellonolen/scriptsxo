import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, FileCheck, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Compliance",
  description: "Review ID verifications, audit logs, and HIPAA compliance status.",
};

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
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Compliance
              </h1>
              <p className="text-sm text-muted-foreground">
                ID verifications, audit logs, and HIPAA compliance.
              </p>
            </div>
          </div>

          {/* Pending Verifications */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary" aria-hidden="true" />
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
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
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
      </main>
    </>
  );
}
