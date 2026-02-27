"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, ChevronRight, Pill, AlertCircle, CheckCircle2, Loader2, Package, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";

const COMMON_MEDICATIONS = [
  { name: "Sumatriptan", dose: "50 mg", type: "Tablet", ndc: "0008-0049-01" },
  { name: "Ibuprofen", dose: "600 mg", type: "Tablet", ndc: "0536-3553-01" },
  { name: "Ondansetron", dose: "4 mg", type: "Tablet", ndc: "0069-2990-30" },
  { name: "Metformin", dose: "500 mg", type: "Tablet", ndc: "0093-1491-01" },
  { name: "Lisinopril", dose: "10 mg", type: "Tablet", ndc: "0093-3145-01" },
  { name: "Atorvastatin", dose: "20 mg", type: "Tablet", ndc: "0069-0120-30" },
];

const PHARMACIES = [
  { id: "ph1", name: "CVS Pharmacy", address: "1201 Main St", city: "Miami, FL", distance: "0.4 mi" },
  { id: "ph2", name: "Walgreens", address: "880 Brickell Ave", city: "Miami, FL", distance: "0.8 mi" },
  { id: "ph3", name: "ScriptsXO Pharmacy", address: "Digital Delivery", city: "Ships to you", distance: "2–4 hrs" },
  { id: "ph4", name: "Publix Pharmacy", address: "5400 NW 2nd Ave", city: "Miami, FL", distance: "1.2 mi" },
];

type Step = "medication" | "pharmacy" | "review" | "submitted";

export default function DashboardOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("medication");
  const [search, setSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<typeof COMMON_MEDICATIONS[0] | null>(null);
  const [customMed, setCustomMed] = useState("");
  const [dosageNotes, setDosageNotes] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState<typeof PHARMACIES[0] | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) setEmail(session.email);
  }, []);

  const filtered = COMMON_MEDICATIONS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setStep("submitted");
    setSubmitting(false);
  }

  if (step === "submitted") {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[800px] mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(91,33,182,0.10)" }}>
              <CheckCircle2 size={28} style={{ color: "#5B21B6" }} />
            </div>
            <h2 className="text-2xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Order Submitted
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              Your request for <strong>{selectedMed?.name ?? customMed}</strong> is pending provider review.
            </p>
            <p className="text-xs text-muted-foreground mb-8">A licensed provider will review your request within 3–8 minutes.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => router.push("/dashboard/prescriptions")} className="px-5 py-2.5 text-sm font-medium text-white rounded-lg" style={{ background: "#5B21B6" }}>
                Track Order
              </button>
              <button onClick={() => { setStep("medication"); setSelectedMed(null); setCustomMed(""); setSelectedPharmacy(null); setClinicalNotes(""); }} className="px-5 py-2.5 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                New Order
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">

        {/* Header */}
        <header className="mb-8">
          <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">NEW ORDER</p>
          <h1 className="text-3xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
            Request a <span style={{ color: "#7C3AED" }}>Prescription</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Submit a medication request to receive a licensed provider review.</p>
        </header>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {(["medication", "pharmacy", "review"] as const).map((s, i) => {
            const stepIndex = ["medication", "pharmacy", "review"].indexOf(step);
            const thisIndex = i;
            const done = thisIndex < stepIndex;
            const active = s === step;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${done ? "bg-[#5B21B6] text-white" : active ? "bg-[#5B21B6] text-white" : "bg-muted text-muted-foreground"}`}>
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-xs capitalize ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s === "medication" ? "Medication" : s === "pharmacy" ? "Pharmacy" : "Review"}
                </span>
                {i < 2 && <ChevronRight size={14} className="text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Medication */}
        {step === "medication" && (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-4">Search Medications</p>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by medication name..."
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#5B21B6] transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map(med => (
                  <button
                    key={med.ndc}
                    onClick={() => setSelectedMed(med)}
                    className={`text-left p-3.5 rounded-lg border transition-colors ${selectedMed?.ndc === med.ndc ? "border-[#5B21B6] bg-[#5B21B6]/5" : "border-border hover:border-[#5B21B6]/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(91,33,182,0.08)" }}>
                        <Pill size={13} style={{ color: "#5B21B6" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.dose} · {med.type}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Not finding what you need? Enter it manually:</p>
                <input
                  type="text"
                  value={customMed}
                  onChange={e => { setCustomMed(e.target.value); setSelectedMed(null); }}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#5B21B6] transition-colors"
                />
              </div>
            </div>

            {/* Dosage / Clinical notes */}
            {(selectedMed || customMed.trim()) && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-3">Additional Notes for Provider</p>
                <textarea
                  value={dosageNotes}
                  onChange={e => setDosageNotes(e.target.value)}
                  placeholder="Any specific dosage preferences, prior history with this medication, or other context..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#5B21B6] transition-colors resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("pharmacy")}
                disabled={!selectedMed && !customMed.trim()}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#5B21B6" }}
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pharmacy */}
        {step === "pharmacy" && (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-4">Choose Your Pharmacy</p>
              <div className="space-y-2">
                {PHARMACIES.map(ph => (
                  <button
                    key={ph.id}
                    onClick={() => setSelectedPharmacy(ph)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedPharmacy?.id === ph.id ? "border-[#5B21B6] bg-[#5B21B6]/5" : "border-border hover:border-[#5B21B6]/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(91,33,182,0.08)" }}>
                          <Package size={15} style={{ color: "#5B21B6" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ph.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin size={10} />{ph.address} · {ph.city}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{ph.distance}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("medication")} className="px-5 py-2.5 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors">Back</button>
              <button
                onClick={() => setStep("review")}
                disabled={!selectedPharmacy}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#5B21B6" }}
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === "review" && (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground">Review Order</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Medication</p>
                  <p className="text-sm font-medium text-foreground">{selectedMed ? `${selectedMed.name} ${selectedMed.dose}` : customMed}</p>
                  {selectedMed && <p className="text-xs text-muted-foreground">{selectedMed.type}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pharmacy</p>
                  <p className="text-sm font-medium text-foreground">{selectedPharmacy?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPharmacy?.city}</p>
                </div>
              </div>

              {dosageNotes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{dosageNotes}</p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-3">Additional Clinical Context (optional)</p>
                <textarea
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  placeholder="Anything else your provider should know..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#5B21B6] transition-colors resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">A licensed provider will review your request before any prescription is issued. This is not a guaranteed approval.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("pharmacy")} className="px-5 py-2.5 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors">Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-70"
                style={{ background: "#5B21B6" }}
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" />Submitting...</>
                ) : (
                  <><CheckCircle2 size={14} />Submit for Review</>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
