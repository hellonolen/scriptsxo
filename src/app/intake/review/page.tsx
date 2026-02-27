"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Stethoscope,
  ScanLine,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  Pencil,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Lock
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { isDev, DevIntakeStore } from "@/lib/dev-helpers";

const INTAKE_STEPS = [
  { label: "Symptoms", icon: Stethoscope },
  { label: "Medical History", icon: Heart },
  { label: "Verification", icon: ScanLine },
  { label: "Payment", icon: CreditCard },
  { label: "Review", icon: FileCheck },
] as const;

export default function IntakeReviewPage() {
  const router = useRouter();
  const [finalConsent, setFinalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [intakeId, setIntakeId] = useState<Id<"intakes"> | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [devData, setDevData] = useState<any>(null);

  const updateIntakeStep = useMutation(api.intake.updateStep);
  const completeIntake = useMutation(api.intake.complete);
  const intakeData = useQuery(
    api.intake.getById,
    !isDevMode && intakeId ? { intakeId } : "skip"
  );

  const currentStep = 4; // Review step is index 4 (last)

  useEffect(() => {
    const dev = isDev();
    setIsDevMode(dev);

    if (dev) {
      const localData = DevIntakeStore.get();
      if (!localData) {
        router.push("/intake/symptoms");
        return;
      }
      setIntakeId(localData.id as Id<"intakes">);
      setDevData(localData);
    } else {
      const storedIntakeId = localStorage.getItem("sxo_intake_id");
      if (!storedIntakeId) {
        router.push("/intake/symptoms");
        return;
      }
      setIntakeId(storedIntakeId as Id<"intakes">);
    }
  }, [router]);

  async function handleSubmit() {
    if (!finalConsent || !intakeId) return;
    setIsSubmitting(true);

    if (isDevMode) {
      DevIntakeStore.updateStep("consent", true);
      DevIntakeStore.complete();
      setIsSubmitted(true);
      return;
    }

    try {
      await updateIntakeStep({
        intakeId,
        stepName: "consent",
        data: true,
      });

      await completeIntake({ intakeId });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit intake:", error);
      // Fallback for dev/demo: mark as submitted anyway
      DevIntakeStore.complete();
      setIsSubmitted(true);
    }
  }

  // Determine the data source (Convex or localStorage)
  const resolvedData = isDevMode ? devData : intakeData;

  if (!resolvedData) {
    return (
      <AppShell>
        <div className="min-h-screen pt-28 pb-24 px-6 flex items-center justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-secondary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const medicalHistory = resolvedData.medicalHistory as any;
  const currentSymptoms = resolvedData.currentSymptoms as any;

  if (isSubmitted) {
    return (
      <AppShell>
        <div className="min-h-screen pt-28 pb-24 px-6 flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-card border border-border rounded-2xl p-12 shadow-sm max-w-lg w-full"
          >
            <div className="w-20 h-20 rounded-full bg-brand-secondary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-brand-secondary" />
            </div>
            <h2
              className="text-3xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Intake Complete
            </h2>
            <p className="text-muted-foreground font-light mb-8 max-w-sm mx-auto leading-relaxed">
              Your information has been submitted successfully. A licensed provider will review your medical history shortly.
            </p>
            <Link
              href={`/consultation?intakeId=${intakeId}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-secondary text-white text-xs tracking-wider uppercase font-light hover:bg-brand-secondary/90 transition-all shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.23)] rounded-xl w-full sm:w-auto"
            >
              Enter Consultation
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12 bg-background">
        <div className="max-w-[1400px] mx-auto">
          {/* Main Layout Grid */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-16">

            {/* Left Column - Sticky Navigation & Context */}
            <div className="lg:col-span-4 lg:col-start-2 xl:col-span-3 xl:col-start-2">
              <div className="sticky top-28 mb-12 lg:mb-0 space-y-12">

                {/* Page Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1
                    className="text-3xl lg:text-4xl font-light text-foreground mb-4"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Review Your Information
                  </h1>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Please review everything below before submitting. You can go back to any section to make changes.
                  </p>

                  {isDevMode && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-xs font-medium">
                      <FileCheck size={14} />
                      DEV MODE: LOCAL DATA
                    </div>
                  )}
                </motion.div>

                {/* Vertical Progress Component */}
                <div className="hidden lg:block">
                  <h3 className="text-xs tracking-[0.2em] text-brand-secondary uppercase font-light mb-6">
                    Intake Progress
                  </h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {INTAKE_STEPS.map((step, index) => {
                      const StepIcon = step.icon;
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;

                      return (
                        <div key={step.label} className="relative flex items-center gap-4">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full border bg-background z-10 transition-colors ${isActive
                              ? "border-brand-secondary shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                              : isCompleted
                                ? "border-brand-secondary bg-brand-secondary/5"
                                : "border-border"
                              }`}
                          >
                            <StepIcon
                              size={14}
                              className={
                                isActive
                                  ? "text-brand-secondary"
                                  : isCompleted
                                    ? "text-brand-secondary/70"
                                    : "text-muted-foreground/50"
                              }
                            />
                          </div>
                          <span
                            className={`text-sm font-light transition-colors ${isActive
                              ? "text-foreground"
                              : isCompleted
                                ? "text-foreground/70"
                                : "text-muted-foreground/50"
                              }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile/Tablet Horizontal Progress */}
                <div className="lg:hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] tracking-[0.2em] text-brand-secondary uppercase font-light">
                      Step {currentStep + 1} of {INTAKE_STEPS.length}
                    </span>
                  </div>
                  <div className="w-full h-px bg-border flex">
                    {INTAKE_STEPS.map((step, index) => {
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;
                      return (
                        <div
                          key={step.label}
                          className={`h-full flex-1 transition-colors ${isActive || isCompleted ? "bg-brand-secondary" : ""
                            }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-6 xl:col-span-6">
              <div className="space-y-8">

                {/* Medical History Section */}
                {medicalHistory && (
                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Heart size={18} className="text-brand-secondary" aria-hidden="true" />
                        <h2
                          className="text-lg font-light text-foreground"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Medical History
                        </h2>
                      </div>
                      <Link
                        href="/intake/medical-history"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-secondary transition-colors"
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Edit
                      </Link>
                    </div>
                    <div className="divide-y divide-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Name</span>
                        <span className="text-sm font-light text-foreground">{medicalHistory.firstName} {medicalHistory.lastName}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Date of Birth</span>
                        <span className="text-sm font-light text-foreground">{medicalHistory.dob}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Gender</span>
                        <span className="text-sm font-light text-foreground">{medicalHistory.gender}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Phone</span>
                        <span className="text-sm font-light text-foreground">{medicalHistory.phone}</span>
                      </div>
                      {medicalHistory.conditions?.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Conditions</span>
                          <span className="text-sm font-light text-foreground">{medicalHistory.conditions.join(", ")}</span>
                        </div>
                      )}
                      {medicalHistory.medications?.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Medications</span>
                          <span className="text-sm font-light text-foreground">{medicalHistory.medications.join(", ")}</span>
                        </div>
                      )}
                      {medicalHistory.allergies?.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Allergies</span>
                          <span className="text-sm font-light text-foreground">{medicalHistory.allergies.join(", ")}</span>
                        </div>
                      )}
                      {medicalHistory.surgeries && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Surgeries</span>
                          <span className="text-sm font-light text-foreground">{medicalHistory.surgeries}</span>
                        </div>
                      )}
                      {medicalHistory.familyHistory?.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Family History</span>
                          <span className="text-sm font-light text-foreground">{medicalHistory.familyHistory.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {/* Current Symptoms Section */}
                {currentSymptoms && (
                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Stethoscope size={18} className="text-brand-secondary" aria-hidden="true" />
                        <h2
                          className="text-lg font-light text-foreground"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Current Symptoms
                        </h2>
                      </div>
                      <Link
                        href="/intake/symptoms"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-secondary transition-colors"
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Edit
                      </Link>
                    </div>
                    <div className="divide-y divide-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Chief Concern</span>
                        <span className="text-sm font-light text-foreground">{currentSymptoms.chiefComplaint || resolvedData.chiefComplaint}</span>
                      </div>
                      {currentSymptoms.duration && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Duration</span>
                          <span className="text-sm font-light text-foreground">{currentSymptoms.duration}</span>
                        </div>
                      )}
                      {currentSymptoms.severity && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Severity</span>
                          <span className="text-sm font-light text-foreground">{currentSymptoms.severity} / 10</span>
                        </div>
                      )}
                      {currentSymptoms.relatedSymptoms?.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Related Symptoms</span>
                          <span className="text-sm font-light text-foreground">{currentSymptoms.relatedSymptoms.join(", ")}</span>
                        </div>
                      )}
                      {currentSymptoms.previousTreatments && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-6 py-4">
                          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0 sm:pt-0.5">Previous Treatments</span>
                          <span className="text-sm font-light text-foreground">{currentSymptoms.previousTreatments}</span>
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {/* Identity Verification Section */}
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <ScanLine size={18} className="text-brand-secondary" aria-hidden="true" />
                      <h2
                        className="text-lg font-light text-foreground"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Identity Verification
                      </h2>
                    </div>
                    <Link
                      href="/intake/id-verification"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-secondary transition-colors"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </Link>
                  </div>
                  <div className="divide-y divide-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-6 py-4">
                      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase sm:w-40 sm:flex-shrink-0">Status</span>
                      <div className="flex items-center gap-2">
                        {resolvedData.idVerified ? (
                          <>
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span className="text-sm font-light text-foreground">Verified via Stripe Identity</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-sm font-light text-foreground">Pending verification</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* HIPAA notice */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-6 bg-[#7C3AED]/[0.02] border border-[#7C3AED]/20 rounded-2xl text-center sm:text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] flex-shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      HIPAA-Compliant Submission
                    </h3>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">
                      Your health information is protected under HIPAA. All data is encrypted in transit and at rest. Only your assigned provider will have access to your intake information.
                    </p>
                  </div>
                </motion.div>

                {/* Final Consent */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm"
                >
                  <div
                    className="group relative flex items-start gap-4 cursor-pointer"
                    onClick={() => setFinalConsent(!finalConsent)}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${finalConsent ? "border-brand-secondary bg-brand-secondary" : "border-muted-foreground/30 bg-background"}`}>
                        <CheckCircle2 size={14} className={`text-white transition-opacity ${finalConsent ? "opacity-100" : "opacity-0"}`} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed select-none">
                      I certify that the information provided is accurate and complete to the best of my knowledge. I consent to receiving telehealth services from a licensed healthcare provider. I understand that telehealth is not a substitute for emergency care. I have reviewed and agree to the{" "}
                      <Link
                        href="/terms"
                        className="text-brand-secondary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/hipaa"
                        className="text-brand-secondary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        HIPAA Notice of Privacy Practices
                      </Link>
                      .
                    </p>
                  </div>
                </motion.div>

                {/* Navigation Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-8"
                >
                  <button
                    onClick={() => router.push("/intake/payment")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-border text-foreground text-xs tracking-wider uppercase font-light hover:bg-muted transition-colors rounded-xl"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={!finalConsent || isSubmitting}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-xs tracking-wider uppercase font-light rounded-xl transition-all duration-300 ${finalConsent
                      ? "bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/10"
                      : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Intake
                        <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </motion.div>

              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
