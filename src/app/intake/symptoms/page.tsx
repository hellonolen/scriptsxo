"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  { label: "Symptoms", icon: Stethoscope },
  { label: "Medical History", icon: Heart },
  { label: "Verification", icon: ScanLine },
  { label: "Payment", icon: CreditCard },
  { label: "Review", icon: FileCheck },
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
    if (value <= 3) return "text-green-700";
    if (value <= 6) return "text-brand-secondary";
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
      // Ensure intake exists in dev mode
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
      <main className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Progress bar */}
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] tracking-[0.2em] text-brand-secondary uppercase font-light">
                Step 1 of 5
              </span>
            </div>
            <div className="w-full h-px bg-border relative">
              <div
                className="absolute top-0 left-0 h-px bg-brand-secondary transition-all duration-500"
                style={{ width: "20%" }}
              />
            </div>
            {/* Step indicators */}
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
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-sm border flex items-center justify-center transition-colors ${
                          isActive
                            ? "border-brand-secondary bg-brand-secondary-muted"
                            : isCompleted
                              ? "border-brand-secondary bg-brand-secondary text-white"
                              : "border-border bg-card"
                        }`}
                      >
                        <StepIcon
                          size={14}
                          className={
                            isActive
                              ? "text-brand-secondary"
                              : isCompleted
                                ? "text-white"
                                : "text-muted-foreground"
                          }
                          aria-hidden="true"
                        />
                      </div>
                      <span
                        className={`text-[10px] tracking-[0.1em] uppercase font-light hidden sm:block ${
                          isActive
                            ? "text-brand-secondary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < INTAKE_STEPS.length - 1 && (
                      <div className="flex-1 h-px bg-border mx-3 mb-5 sm:mb-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page header */}
          <div className="max-w-2xl mb-10">
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Current Symptoms
            </h1>
            <p className="text-muted-foreground font-light">
              Describe what brings you in today. The more detail you provide, the
              better your provider can prepare for your consultation.
            </p>
          </div>

          {/* Form */}
          <div className="max-w-2xl space-y-10">
            {/* Chief Complaint */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Chief Complaint
              </h2>
              <div className="h-px bg-border mb-4" />
              <label className="block text-xs font-medium tracking-wider text-muted-foreground mb-3 uppercase">
                What brings you in today? <span className="text-destructive">*</span>
              </label>
              <textarea
                placeholder="Please describe your primary concern in as much detail as you feel comfortable sharing..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors min-h-[140px] resize-y text-base font-light"
                required
              />
            </section>

            {/* Symptom Duration */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Symptom Duration
              </h2>
              <div className="h-px bg-border mb-4" />
              <label className="block text-xs font-medium tracking-wider text-muted-foreground mb-3 uppercase">
                How long have you experienced these symptoms? <span className="text-destructive">*</span>
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-base"
                required
              >
                <option value="">Select duration</option>
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </section>

            {/* Severity Slider */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Severity
              </h2>
              <div className="h-px bg-border mb-4" />
              <label className="block text-xs font-medium tracking-wider text-muted-foreground mb-5 uppercase">
                Rate the severity of your symptoms
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light text-muted-foreground">
                    Mild
                  </span>
                  <span
                    className={`text-lg font-light ${getSeverityColor(severity)}`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {severity} / 10
                  </span>
                  <span className="text-sm font-light text-muted-foreground">
                    Severe
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full h-1 bg-border rounded-sm appearance-none cursor-pointer accent-brand-secondary"
                  aria-label="Symptom severity"
                />
                <p
                  className={`text-sm font-light text-center ${getSeverityColor(severity)}`}
                >
                  {getSeverityLabel(severity)}
                </p>
              </div>
            </section>

            {/* Related Symptoms */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Related Symptoms
              </h2>
              <div className="h-px bg-border mb-4" />
              <p className="text-sm text-muted-foreground font-light mb-5">
                Select any additional symptoms you are experiencing alongside
                your primary concern.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {RELATED_SYMPTOMS.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`px-4 py-3 text-sm font-light rounded-md border transition-all duration-200 text-left ${
                        isSelected
                          ? "border-brand-secondary bg-brand-secondary-muted text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50"
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
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Previous Treatments
              </h2>
              <div className="h-px bg-border mb-4" />
              <label className="block text-xs font-medium tracking-wider text-muted-foreground mb-3 uppercase">
                What have you already tried?
              </label>
              <textarea
                placeholder="Describe any over-the-counter medications, home remedies, or prior treatments you have attempted..."
                value={previousTreatments}
                onChange={(e) => setPreviousTreatments(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors min-h-[120px] resize-y text-base font-light"
              />
            </section>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-border">
              <button
                onClick={() => router.push("/dashboard/order")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>
              <button
                onClick={handleContinue}
                className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background text-[11px] tracking-[0.15em] uppercase font-light hover:bg-foreground/90 transition-all duration-300 rounded-md"
              >
                Continue
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
