"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";
import { members } from "@/lib/api";
import { ShieldCheck } from "lucide-react";

/* ── Constants ──────────────────────────────────────────────── */

const STEPS = [
  { id: 1, label: "Symptoms" },
  { id: 2, label: "History" },
  { id: 3, label: "Verify" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Review" },
];

const DURATION_OPTIONS = [
  "Less than 24 hours",
  "1 – 3 days",
  "3 – 7 days",
  "1 – 2 weeks",
  "More than 2 weeks",
];

const RELATED_SYMPTOMS = [
  "Fever", "Headache", "Nausea", "Fatigue", "Dizziness",
  "Shortness of Breath", "Chest Pain", "Body Aches", "Chills",
  "Loss of Appetite", "Sore Throat", "Cough", "Congestion",
  "Insomnia", "Vomiting",
];

/* ── Page ───────────────────────────────────────────────────── */

export default function SymptomsPage() {
  const router = useRouter();
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [previousTreatments, setPreviousTreatments] = useState("");

  useEffect(() => {
    // Restore previous step data if available
    const stored = localStorage.getItem("sxo_symptoms");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.chiefComplaint) setChiefComplaint(data.chiefComplaint);
        if (data.duration) setDuration(data.duration);
        if (data.severity) setSeverity(data.severity);
        if (data.relatedSymptoms) setSelectedSymptoms(data.relatedSymptoms);
        if (data.previousTreatments) setPreviousTreatments(data.previousTreatments);
      } catch {
        // Ignore malformed stored data
      }
    }
  }, []);

  function toggleSymptom(s: string) {
    setSelectedSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  function getSeverityLabel(v: number) {
    if (v <= 2) return "Mild";
    if (v <= 4) return "Moderate";
    if (v <= 6) return "Noticeable";
    if (v <= 8) return "Severe";
    return "Very Severe";
  }

  async function handleContinue() {
    const data = { chiefComplaint, duration, severity, relatedSymptoms: selectedSymptoms, previousTreatments };

    // Ensure member exists in the system
    const session = getSessionCookie();
    if (!session?.email) { router.push("/access"); return; }

    try {
      await members.getOrCreate(session.email);
    } catch {
      // Non-fatal — continue even if member sync fails
    }

    // Persist step data locally for review page
    localStorage.setItem("sxo_symptoms", JSON.stringify(data));

    router.push("/intake/medical-history");
  }

  const currentStep = 1;
  const pct = (currentStep / STEPS.length) * 100;
  const canContinue = chiefComplaint.trim().length > 0 && duration.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="bg-card border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">ScriptsXO</span>
          <div className="mt-1 w-6 h-[2px] rounded-full bg-brand-secondary" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          HIPAA Compliant
        </div>
      </header>

      {/* Progress bar */}
      <div className="progress-bar h-[3px] rounded-none shrink-0">
        <div
          className="progress-bar-fill transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 flex justify-center px-4 py-8 pb-16">
        <div className="w-full max-w-[560px]">

          {/* Step dots */}
          <div className="flex items-center mb-6 px-2">
            {STEPS.map((st, i) => (
              <div key={st.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
                <div className={[
                  "rounded-full shrink-0 flex items-center justify-center font-bold transition-all duration-300",
                  st.id === currentStep
                    ? "w-8 h-8 bg-brand-secondary text-white shadow-[0_0_0_4px_rgba(124,58,237,0.15)]"
                    : st.id < currentStep
                    ? "w-7 h-7 bg-brand-secondary text-white"
                    : "w-7 h-7 bg-transparent border-2 border-border text-muted-foreground",
                ].join(" ")}>
                  {st.id < currentStep ? (
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className={st.id === currentStep ? "text-[13px]" : "text-[11px]"}>{st.id}</span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={[
                    "flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300",
                    st.id < currentStep ? "bg-brand-secondary" : "bg-border",
                  ].join(" ")} />
                )}
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex justify-between mb-8 px-1">
            {STEPS.map(st => (
              <div key={st.id} className={[
                "flex-1 text-center eyebrow transition-colors duration-300",
                st.id === currentStep || st.id < currentStep ? "text-brand-secondary" : "text-muted-foreground",
              ].join(" ")}>
                {st.label}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="glass-card mb-6">

            <div className="mb-7">
              <h1 className="text-xl font-medium text-foreground mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Current Symptoms
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Describe what brings you in today. A licensed provider will review your request before any prescription is issued.
              </p>
            </div>

            {/* Chief Concern */}
            <div className="form-group mb-5">
              <label className="form-label form-label-required">Chief Concern</label>
              <p className="form-description mb-1.5">Be as specific as possible — more detail helps the provider prepare.</p>
              <textarea
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="Describe your primary concern..."
                rows={4}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-y min-h-[100px] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
              />
            </div>

            {/* Duration */}
            <div className="form-group mb-5">
              <label className="form-label form-label-required">Symptom Duration</label>
              <div className="relative">
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground appearance-none cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                >
                  <option value="" disabled>Select duration</option>
                  {DURATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Severity */}
            <div className="form-group mb-5">
              <label className="form-label">Severity</label>
              <div className="rounded-xl border border-input bg-background px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="eyebrow text-muted-foreground">Mild</span>
                  <span className="text-2xl font-light text-foreground tracking-tight">
                    {severity}<span className="text-xs text-muted-foreground ml-0.5">/10</span>
                  </span>
                  <span className="eyebrow text-muted-foreground">Severe</span>
                </div>
                <div className="progress-bar mb-3">
                  <div
                    className="progress-bar-fill transition-all duration-150"
                    style={{ width: `${((severity - 1) / 9) * 100}%` }}
                  />
                </div>
                <input
                  type="range" min={1} max={10} value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  className="w-full opacity-0 absolute"
                  style={{ marginTop: -8, height: 8, cursor: "pointer" }}
                />
                <p className="text-center text-xs font-medium text-brand-secondary mt-2">
                  {getSeverityLabel(severity)}
                </p>
              </div>
            </div>

            {/* Related Symptoms */}
            <div className="form-group mb-5">
              <label className="form-label">Additional Symptoms</label>
              <p className="form-description mb-2">Select any that apply.</p>
              <div className="flex flex-wrap gap-2">
                {RELATED_SYMPTOMS.map(symptom => {
                  const selected = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={[
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                        selected
                          ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary"
                          : "bg-background border-input text-muted-foreground hover:border-brand-secondary/40",
                      ].join(" ")}
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Previous Treatments */}
            <div className="form-group">
              <label className="form-label">Previous Treatments</label>
              <p className="form-description mb-1.5">OTC medications, home remedies, or prior prescriptions you&apos;ve tried.</p>
              <textarea
                value={previousTreatments}
                onChange={e => setPreviousTreatments(e.target.value)}
                placeholder="Describe any treatments you've attempted..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-y focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
              />
            </div>

          </div>

          {/* Navigation */}
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={[
              "btn-gradient w-full py-3.5 text-sm font-medium relative z-10",
              !canContinue && "opacity-40 cursor-not-allowed",
            ].join(" ")}
          >
            Continue to Medical History
          </button>

          <p className="text-center mt-5 text-[11px] text-muted-foreground leading-relaxed">
            Your information is protected under HIPAA and encrypted in transit.
          </p>

        </div>
      </main>
    </div>
  );
}
