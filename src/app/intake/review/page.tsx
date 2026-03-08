"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Stethoscope, ScanLine, ShieldCheck, FileCheck, Pencil, CheckCircle2 } from "lucide-react";
import { getSessionCookie } from "@/lib/auth";
import { patients } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";

const STEPS = [
  { id: 1, label: "Symptoms" },
  { id: 2, label: "History" },
  { id: 3, label: "Verify" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Review" },
];

export default function IntakeReviewPage() {
  const router = useRouter();
  const [finalConsent, setFinalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  // Data read from localStorage — set by previous intake steps
  const [medicalHistory, setMedicalHistory] = useState<Record<string, any> | null>(null);
  const [currentSymptoms, setCurrentSymptoms] = useState<Record<string, any> | null>(null);
  const [idVerified, setIdVerified] = useState(false);

  const currentStep = 5;
  const pct = (currentStep / STEPS.length) * 100;

  useEffect(() => {
    const symptomsRaw = localStorage.getItem("sxo_symptoms");
    const historyRaw = localStorage.getItem("sxo_medical_history");

    if (!symptomsRaw && !historyRaw) {
      router.push("/intake/symptoms");
      return;
    }

    if (symptomsRaw) {
      try { setCurrentSymptoms(JSON.parse(symptomsRaw)); } catch { }
    }
    if (historyRaw) {
      try { setMedicalHistory(JSON.parse(historyRaw)); } catch { }
    }

    setIdVerified(localStorage.getItem("sxo_id_verified") === "true");
  }, [router]);

  async function handleSubmit() {
    if (!finalConsent) return;
    setIsSubmitting(true);

    try {
      const session = getSessionCookie();
      if (!session?.email) { router.push("/access"); return; }

      // Ensure patient record exists
      let patientRecord = await patients.getByEmail(session.email).catch(() => null);
      if (!patientRecord && medicalHistory) {
        patientRecord = await patients.create({
          email: session.email,
          firstName: medicalHistory.firstName,
          lastName: medicalHistory.lastName,
          dateOfBirth: medicalHistory.dob,
          gender: medicalHistory.gender,
          phone: medicalHistory.phone,
          conditions: medicalHistory.conditions ?? [],
          medications: medicalHistory.medications ?? [],
          allergies: medicalHistory.allergies ?? [],
          surgeries: medicalHistory.surgeries ?? "",
          familyHistory: medicalHistory.familyHistory ?? [],
          idVerified,
        }).catch(() => null);
      }

      const patientId = (patientRecord as any)?._id ?? (patientRecord as any)?.id;

      // Create consultation record
      const consultRes = await fetch(`${API_BASE}/consultations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          chiefComplaint: currentSymptoms?.chiefComplaint ?? "",
          status: "waiting",
          type: "video",
        }),
      });
      const consultJson = await consultRes.json() as { success: boolean; data?: { id: string }; error?: string };
      const newConsultId = consultJson.data?.id ?? null;
      if (newConsultId) setConsultationId(newConsultId);

      // Enqueue the consultation in the waiting room
      if (newConsultId) {
        await fetch(`${API_BASE}/consultations/${newConsultId}/enqueue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: "{}",
        }).catch(() => {});
      }

      // Clear intake localStorage
      localStorage.removeItem("sxo_symptoms");
      localStorage.removeItem("sxo_medical_history");
      localStorage.removeItem("sxo_id_verified");

      setIsSubmitted(true);
    } catch {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card text-center max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-brand-secondary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-brand-secondary" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Intake Complete
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Your information has been submitted. A licensed provider will review your intake shortly.
            </p>
            <Link
              href={consultationId ? `/consultation/waiting-room?id=${consultationId}` : "/consultation/waiting-room"}
              className="btn-gradient inline-flex items-center justify-center w-full py-3.5 text-sm font-medium relative z-10"
            >
              Enter Consultation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!medicalHistory && !currentSymptoms) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="spinner spinner-lg text-brand-secondary" />
      </div>
    );
  }

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
        <div className="progress-bar-fill transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

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
                  <div className={["flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300", st.id < currentStep ? "bg-brand-secondary" : "bg-border"].join(" ")} />
                )}
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex justify-between mb-8 px-1">
            {STEPS.map(st => (
              <div key={st.id} className={["flex-1 text-center eyebrow transition-colors duration-300", st.id === currentStep || st.id < currentStep ? "text-brand-secondary" : "text-muted-foreground"].join(" ")}>
                {st.label}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-medium text-foreground mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Review Your Information
            </h1>
            <p className="text-sm text-muted-foreground">
              Review everything below before submitting.
            </p>
          </div>

          {/* Medical History */}
          {medicalHistory && (
            <div className="glass-card mb-4">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-secondary" />
                  <span className="text-sm font-medium text-foreground">Medical History</span>
                </div>
                <Link href="/intake/medical-history" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-secondary transition-colors">
                  <Pencil className="w-3 h-3" /> Edit
                </Link>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Name", value: `${medicalHistory.firstName} ${medicalHistory.lastName}` },
                  { label: "Date of Birth", value: medicalHistory.dob },
                  { label: "Gender", value: medicalHistory.gender },
                  { label: "Phone", value: medicalHistory.phone },
                  medicalHistory.conditions?.length > 0 && { label: "Conditions", value: medicalHistory.conditions.join(", ") },
                  medicalHistory.medications?.length > 0 && { label: "Medications", value: medicalHistory.medications.join(", ") },
                  medicalHistory.allergies?.length > 0 && { label: "Allergies", value: medicalHistory.allergies.join(", ") },
                  medicalHistory.surgeries && { label: "Surgeries", value: medicalHistory.surgeries },
                  medicalHistory.familyHistory?.length > 0 && { label: "Family History", value: medicalHistory.familyHistory.join(", ") },
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} className="flex gap-3">
                    <span className="eyebrow text-muted-foreground w-28 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-sm text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms */}
          {currentSymptoms && (
            <div className="glass-card mb-4">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-brand-secondary" />
                  <span className="text-sm font-medium text-foreground">Symptoms</span>
                </div>
                <Link href="/intake/symptoms" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-secondary transition-colors">
                  <Pencil className="w-3 h-3" /> Edit
                </Link>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Chief Concern", value: currentSymptoms.chiefComplaint },
                  currentSymptoms.duration && { label: "Duration", value: currentSymptoms.duration },
                  currentSymptoms.severity && { label: "Severity", value: `${currentSymptoms.severity} / 10` },
                  currentSymptoms.relatedSymptoms?.length > 0 && { label: "Related", value: currentSymptoms.relatedSymptoms.join(", ") },
                  currentSymptoms.previousTreatments && { label: "Treatments", value: currentSymptoms.previousTreatments },
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} className="flex gap-3">
                    <span className="eyebrow text-muted-foreground w-28 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-sm text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Identity */}
          <div className="glass-card mb-4">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-brand-secondary" />
                <span className="text-sm font-medium text-foreground">Identity Verification</span>
              </div>
              <Link href="/intake/id-verification" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-secondary transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {idVerified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-foreground">Verified via Stripe Identity</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-sm text-foreground">Pending verification</span>
                </>
              )}
            </div>
          </div>

          {/* HIPAA notice */}
          <div className="flex gap-3 p-4 rounded-xl bg-brand-secondary/[0.04] border border-brand-secondary/15 mb-5">
            <ShieldCheck className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground mb-0.5">HIPAA-Compliant Submission</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your health information is protected under HIPAA. All data is encrypted in transit and at rest. Only your assigned provider will have access to your intake.
              </p>
            </div>
          </div>

          {/* Consent */}
          <div className="glass-card mb-5">
            <div className="flex gap-3 cursor-pointer" onClick={() => setFinalConsent(!finalConsent)}>
              <div className={["w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors", finalConsent ? "border-brand-secondary bg-brand-secondary" : "border-muted-foreground/30 bg-background"].join(" ")}>
                {finalConsent && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed select-none">
                I certify that the information provided is accurate. I consent to receiving telehealth services from a licensed healthcare provider. I agree to the{" "}
                <Link href="/terms" className="text-brand-secondary hover:underline" onClick={e => e.stopPropagation()}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="/hipaa" className="text-brand-secondary hover:underline" onClick={e => e.stopPropagation()}>HIPAA Notice of Privacy Practices</Link>.
              </p>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={!finalConsent || isSubmitting}
            className={["btn-gradient w-full py-3.5 text-sm font-medium relative z-10 flex items-center justify-center gap-2", (!finalConsent || isSubmitting) && "opacity-40 cursor-not-allowed"].join(" ")}>
            {isSubmitting ? <><span className="spinner" /> Submitting...</> : "Submit Intake"}
          </button>

          <p className="text-center mt-5 text-[11px] text-muted-foreground leading-relaxed">
            Your information is protected under HIPAA and encrypted in transit.
          </p>
        </div>
      </main>
    </div>
  );
}
