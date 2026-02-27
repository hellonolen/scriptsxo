"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart,
  Stethoscope,
  ScanLine,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getSessionCookie } from "@/lib/auth";
import { isDev, DevIntakeStore } from "@/lib/dev-helpers";

const INTAKE_STEPS = [
  { label: "Symptoms", icon: Stethoscope, desc: "Initial details" },
  { label: "Medical History", icon: Heart, desc: "Health background" },
  { label: "Verification", icon: ScanLine, desc: "Verify identity" },
  { label: "Payment", icon: CreditCard, desc: "Security deposit" },
  { label: "Review", icon: FileCheck, desc: "Final check" },
] as const;

const DURATION_OPTIONS = [
  "Less than 24 hours",
  "1 - 3 days",
  "3 - 7 days",
  "1 - 2 weeks",
  "More than 2 weeks",
] as const;

const RELATED_SYMPTOMS = [
  "Fever",
  "Headache",
  "Nausea",
  "Fatigue",
  "Dizziness",
  "Shortness of Breath",
  "Chest Pain",
  "Body Aches",
  "Chills",
  "Loss of Appetite",
  "Sore Throat",
  "Cough",
  "Congestion",
  "Insomnia",
  "Vomiting",
] as const;

export default function SymptomsPage() {
  const router = useRouter();
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [previousTreatments, setPreviousTreatments] = useState("");
  const [intakeId, setIntakeId] = useState<Id<"intakes"> | null>(null);

  const updateIntakeStep = useMutation(api.intake.updateStep);
  const createIntake = useMutation(api.intake.create);
  const getOrCreateMember = useMutation(api.members.getOrCreate);

  const currentStep = 0;

  useEffect(() => {
    // Symptoms is now the first intake step — no redirect if no intake ID yet.
    // The intake record is created on Continue if not already present.
    const storedIntakeId = isDev()
      ? DevIntakeStore.getId()
      : localStorage.getItem("sxo_intake_id");
    if (storedIntakeId) {
      setIntakeId(storedIntakeId as Id<"intakes">);
    }
  }, []);

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  }

  function getSeverityLabel(value: number): string {
    if (value <= 2) return "Mild";
    if (value <= 4) return "Moderate";
    if (value <= 6) return "Noticeable";
    if (value <= 8) return "Severe";
    return "Very Severe";
  }

  function getSeverityColor(value: number): string {
    if (value <= 3) return "text-emerald-500";
    if (value <= 6) return "text-[#2DD4BF]";
    return "text-destructive";
  }

  async function handleContinue() {
    const symptomsData = {
      chiefComplaint,
      duration,
      severity,
      relatedSymptoms: selectedSymptoms,
      previousTreatments,
    };

    if (isDev()) {
      if (!DevIntakeStore.getId()) {
        const session = getSessionCookie();
        if (session?.email) DevIntakeStore.create(session.email);
      }
      DevIntakeStore.updateStep("symptoms", symptomsData);
      router.push("/intake/medical-history");
      return;
    }

    try {
      let currentIntakeId = intakeId;

      if (!currentIntakeId) {
        // Create intake record on the first step
        const session = getSessionCookie();
        if (!session?.email) {
          router.push("/access");
          return;
        }
        await getOrCreateMember({ email: session.email });
        const newId = await createIntake({ email: session.email });
        currentIntakeId = newId;
        localStorage.setItem("sxo_intake_id", newId);
        setIntakeId(newId);
      }

      await updateIntakeStep({
        intakeId: currentIntakeId,
        stepName: "symptoms",
        data: symptomsData,
      });
    } catch (err) {
      console.error("Failed to save symptoms:", err);
      // Fallback: save locally and proceed
      const session = getSessionCookie();
      if (!DevIntakeStore.getId() && session?.email) {
        DevIntakeStore.create(session.email);
      }
      DevIntakeStore.updateStep("symptoms", symptomsData);
    }

    router.push("/intake/medical-history");
  }

  return (
    <AppShell>
      <main className="min-h-screen pt-24 pb-32 px-6 sm:px-8 lg:px-16 w-full max-w-[1600px] mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">

          {/* ==========================================
              LEFT COLUMN - Sticky header & progress 
          =========================================== */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Page header */}
              <div className="mb-12">
                <span className="text-[11px] tracking-[0.2em] text-[#7C3AED] uppercase font-bold mb-4 block">
                  Step 1 of 5
                </span>
                <h1
                  className="text-3xl lg:text-[40px] font-light text-foreground leading-[1.1] tracking-tight mb-5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Current Symptoms
                </h1>
                <p className="text-muted-foreground font-light text-[15px] leading-relaxed max-w-[340px]">
                  Describe what brings you in today. The more detail you provide, the
                  better your provider can prepare for your consultation.
                </p>
              </div>

              {/* Progress (Vertical Version - Desktop) */}
              <div className="hidden lg:block pb-8 border-b border-border/50">
                <div className="space-y-6">
                  {INTAKE_STEPS.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === currentStep;
                    const isPast = index < currentStep;

                    return (
                      <div key={step.label} className="flex items-start gap-5">
                        <div className="relative flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${isActive
                            ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                            : isPast
                              ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                              : "border-border/60 bg-transparent text-muted-foreground/60"
                            }`}>
                            <StepIcon size={15} />
                          </div>
                          {index < INTAKE_STEPS.length - 1 && (
                            <div className={`w-px h-8 mt-2 -mb-4 ${isPast ? "bg-[#7C3AED]/40" : "bg-border/60"}`} />
                          )}
                        </div>
                        <div className="pt-2 flex flex-col">
                          <span className={`text-[14px] font-medium tracking-wide ${isActive ? "text-foreground" : isPast ? "text-foreground/80" : "text-muted-foreground/60"}`}>
                            {step.label}
                          </span>
                          <span className={`text-[12px] font-light ${isActive ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Mobile Horizontal Progress (fallback) */}
            <div className="lg:hidden mb-10">
              <div className="flex items-center gap-0 mt-6">
                {INTAKE_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center flex-1 last:flex-0"
                    >
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${isActive
                        ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                        : isCompleted
                          ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                          : "border-border bg-transparent text-muted-foreground/50"
                        }`}
                      >
                        <StepIcon size={13} />
                      </div>
                      {index < INTAKE_STEPS.length - 1 && (
                        <div className={`flex-1 h-px mx-2 ${isCompleted ? "bg-[#7C3AED]/50" : "bg-border"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ==========================================
              RIGHT COLUMN - Continuous Form flow 
          =========================================== */}
          <div className="lg:col-span-8 lg:pt-8 relative">
            <motion.div
              className="space-y-16 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >

              {/* Chief Concern */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Chief Concern
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    What primary concern brings you in today? <span className="text-destructive">*</span>
                  </p>
                </div>
                <textarea
                  placeholder="Please describe your primary concern in as much detail as you feel comfortable sharing..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all min-h-[160px] resize-y text-[15px] font-light leading-relaxed shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                  required
                />
              </section>

              {/* Symptom Duration */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Symptom Duration
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    How long have you experienced these symptoms? <span className="text-destructive">*</span>
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)] appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select duration</option>
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </section>

              {/* Severity Slider */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Severity
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Rate the current severity of your symptoms
                  </p>
                </div>

                <div className="bg-white border border-border/80 rounded-[8px] p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[13px] font-light text-slate-500 uppercase tracking-wider">
                      Mild
                    </span>
                    <span
                      className={`text-[28px] font-light ${getSeverityColor(severity)} tracking-tighter tabular-nums`}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {severity} <span className="text-[14px] text-slate-400">/ 10</span>
                    </span>
                    <span className="text-[13px] font-light text-slate-500 uppercase tracking-wider">
                      Severe
                    </span>
                  </div>
                  <div className="relative pt-2 pb-5">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={severity}
                      onChange={(e) => setSeverity(Number(e.target.value))}
                      className="w-full h-[6px] bg-slate-100 rounded-full appearance-none flex cursor-pointer"
                      style={{
                        accentColor: "#7C3AED",
                        background: `linear-gradient(to right, #7C3AED ${(severity - 1) * 11.1}%, #f1f5f9 ${(severity - 1) * 11.1}%, #f1f5f9 100%)`
                      }}
                      aria-label="Symptom severity"
                    />
                  </div>
                  <p
                    className={`text-[14px] font-medium text-center ${getSeverityColor(severity)} mt-2`}
                  >
                    {getSeverityLabel(severity)}
                  </p>
                </div>
              </section>

              {/* Related Symptoms */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Related Symptoms
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Select any additional symptoms you are experiencing
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {RELATED_SYMPTOMS.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-5 py-2.5 text-[14px] tracking-wide font-light rounded-full border transition-all duration-200 ${isSelected
                          ? "border-[#7C3AED] bg-[#7C3AED]/5 text-[#7C3AED]"
                          : "border-border/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                          }`}
                        aria-pressed={isSelected}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Previous Treatments */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Previous Treatments
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    What have you already tried?
                  </p>
                </div>
                <textarea
                  placeholder="Describe any over-the-counter medications, home remedies, or prior treatments you have attempted..."
                  value={previousTreatments}
                  onChange={(e) => setPreviousTreatments(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all min-h-[140px] resize-y text-[15px] font-light leading-relaxed shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </section>

              {/* Navigation */}
              <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between pt-10 mt-10 border-t border-border/50">
                <button
                  onClick={() => router.push("/dashboard/order")}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 border border-border/80 bg-white text-slate-700 text-[12px] tracking-[0.15em] font-medium uppercase hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-[8px] shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="w-full sm:w-auto bg-[#7C3AED] inline-flex justify-center items-center gap-3 px-10 py-4 text-white text-[12px] tracking-[0.2em] font-medium uppercase hover:bg-[#6D28D9] transition-all duration-300 rounded-[8px] shadow-lg shadow-purple-500/20"
                >
                  Continue
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>

            </motion.div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
