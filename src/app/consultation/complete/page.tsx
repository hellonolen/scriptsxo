"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/* ---------------------------------------------------------------------------
   Visit data (demo)
   --------------------------------------------------------------------------- */

const VISIT_DATE = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const NEXT_STEPS = [
  "Prescription sent to your pharmacy — ready in 1-2 hours",
  "Follow up in 7 days if symptoms persist",
  "Hydrate and rest — avoid screens for 2 hours",
] as const;

/* ---------------------------------------------------------------------------
   Section card wrapper
   --------------------------------------------------------------------------- */

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="glass-card p-6">{children}</div>;
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function ConsultationCompletePage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">

        {/* ---- Completion header ---- */}
        <div className="text-center space-y-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "#5B21B6" }}
          >
            <CheckCircle2 size={28} className="text-white" aria-hidden="true" />
          </div>

          <div>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Consultation Complete
            </h1>
            <p className="text-sm font-light text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
              Your visit summary is ready. Your provider will follow up on any outstanding items.
            </p>
          </div>
        </div>

        {/* ---- Visit Summary ---- */}
        <SectionCard>
          <p className="eyebrow mb-4">VISIT SUMMARY</p>
          <dl className="space-y-3">
            {[
              { term: "Date", detail: VISIT_DATE },
              { term: "Provider", detail: "Dr. Sarah Mitchell, MD" },
              { term: "Duration", detail: "14 minutes" },
              { term: "Chief Concern", detail: "Persistent headache — 3 days duration" },
              {
                term: "Assessment",
                detail:
                  "Tension headache, likely stress-related. Monitor for 48 hours.",
              },
            ].map(({ term, detail }) => (
              <div key={term} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <dt className="text-xs font-light text-muted-foreground tracking-wide uppercase w-36 shrink-0 pt-0.5">
                  {term}
                </dt>
                <dd className="text-sm font-light text-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        {/* ---- Prescription ---- */}
        <SectionCard>
          <p className="eyebrow mb-4">PRESCRIPTION</p>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Ibuprofen 400mg</p>
              <p className="text-sm font-light text-muted-foreground">
                Take 1 tablet every 6 hours as needed. Do not exceed 4 doses/day.
              </p>
              <p className="text-xs font-light text-muted-foreground pt-1">
                CVS Pharmacy — Main St
              </p>
            </div>
            <div className="shrink-0">
              <span
                className="inline-block px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm text-white"
                style={{ background: "#059669" }}
              >
                Sent to Pharmacy
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ---- Next Steps ---- */}
        <SectionCard>
          <p className="eyebrow mb-4">NEXT STEPS</p>
          <ul className="space-y-3">
            {NEXT_STEPS.map((step) => (
              <li key={step} className="flex items-start gap-3">
                <CheckCircle2
                  size={16}
                  className="shrink-0 mt-0.5"
                  style={{ color: "#2DD4BF" }}
                  aria-hidden="true"
                />
                <span className="text-sm font-light text-foreground">{step}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* ---- Actions ---- */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 text-sm font-light text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "#5B21B6" }}
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push("/dashboard/prescriptions")}
            className="px-6 py-2.5 text-sm font-light rounded-lg border transition-colors hover:bg-foreground/5"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            View Prescriptions
          </button>
          <button
            onClick={() => router.push("/dashboard/appointments")}
            className="px-6 py-2.5 text-sm font-light rounded-lg border transition-colors hover:bg-foreground/5"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            Schedule Follow-up
          </button>
        </div>
      </div>
    </AppShell>
  );
}
