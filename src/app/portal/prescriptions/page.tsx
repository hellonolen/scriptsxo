import type { Metadata } from "next";
import Link from "next/link";
import { Pill, RefreshCw, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "My Prescriptions",
  description: "View and manage your active prescriptions and medication history.",
};

const SAMPLE_PRESCRIPTIONS = [
  {
    name: "Amoxicillin 500mg",
    dosage: "1 capsule 3x daily for 10 days",
    status: "active" as const,
    prescriber: "Dr. Johnson",
    pharmacy: "CVS Pharmacy - Main St",
    filled: "Feb 10, 2026",
    refills: 0,
  },
  {
    name: "Lisinopril 10mg",
    dosage: "1 tablet daily",
    status: "active" as const,
    prescriber: "Dr. Martinez",
    pharmacy: "Walgreens - Oak Ave",
    filled: "Jan 28, 2026",
    refills: 5,
  },
];

export default function PrescriptionsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/portal" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                My Prescriptions
              </h1>
              <p className="text-sm text-muted-foreground">
                View active prescriptions and request refills.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {SAMPLE_PRESCRIPTIONS.map((rx, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Pill size={18} className="text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{rx.name}</h3>
                      <p className="text-xs text-muted-foreground">{rx.dosage}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Prescriber</span>
                    <span className="text-foreground">{rx.prescriber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Pharmacy</span>
                    <span className="text-foreground">{rx.pharmacy}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Last Filled</span>
                    <span className="text-foreground">{rx.filled}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Refills Left</span>
                    <span className="text-foreground">{rx.refills}</span>
                  </div>
                </div>

                {rx.refills > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                      <RefreshCw size={14} aria-hidden="true" />
                      Request Refill
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
