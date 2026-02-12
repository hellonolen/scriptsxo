"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";

const INTAKE_STEPS = [
  { label: "Medical History", icon: Heart },
  { label: "Symptoms", icon: Stethoscope },
  { label: "Verification", icon: ScanLine },
  { label: "Review", icon: FileCheck },
] as const;

const REVIEW_SECTIONS = [
  {
    title: "Medical History",
    href: "/intake/medical-history",
    icon: Heart,
    items: [
      { label: "Name", value: "Jane Doe" },
      { label: "Date of Birth", value: "March 15, 1988" },
      { label: "Gender", value: "Female" },
      { label: "Phone", value: "(555) 123-4567" },
      { label: "Conditions", value: "Hypertension, High Cholesterol" },
      { label: "Medications", value: "Lisinopril 10mg daily, Atorvastatin 20mg daily" },
      { label: "Allergies", value: "Penicillin (rash)" },
      { label: "Surgeries", value: "Appendectomy (2015)" },
      { label: "Family History", value: "Heart Disease, Diabetes" },
    ],
  },
  {
    title: "Current Symptoms",
    href: "/intake/symptoms",
    icon: Stethoscope,
    items: [
      { label: "Chief Complaint", value: "Persistent headaches for the past week, worsening in the evenings" },
      { label: "Duration", value: "1 - 2 weeks" },
      { label: "Severity", value: "6 / 10" },
      { label: "Related Symptoms", value: "Fatigue, Insomnia, Nausea" },
      { label: "Previous Treatments", value: "Over-the-counter ibuprofen with limited relief" },
    ],
  },
  {
    title: "Identity Verification",
    href: "/intake/id-verification",
    icon: ScanLine,
    items: [
      { label: "Government ID (Front)", value: "drivers-license-front.jpg" },
      { label: "Government ID (Back)", value: "drivers-license-back.jpg" },
      { label: "Insurance Card", value: "insurance-card.jpg" },
    ],
  },
] as const;

export default function IntakeReviewPage() {
  const [finalConsent, setFinalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentStep = 3;

  function handleSubmit() {
    if (!finalConsent) return;
    setIsSubmitting(true);
    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Progress bar */}
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] tracking-[0.2em] text-brand-secondary uppercase font-light">
                Step 4 of 4
              </span>
            </div>
            <div className="w-full h-px bg-border relative">
              <div
                className="absolute top-0 left-0 h-px bg-brand-secondary transition-all duration-500"
                style={{ width: "100%" }}
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
                        {isCompleted ? (
                          <Check size={14} className="text-white" aria-hidden="true" />
                        ) : (
                          <StepIcon
                            size={14}
                            className={
                              isActive
                                ? "text-brand-secondary"
                                : "text-muted-foreground"
                            }
                            aria-hidden="true"
                          />
                        )}
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
              Review Your Information
            </h1>
            <p className="text-muted-foreground font-light">
              Please review everything below before submitting. You can go back
              to any section to make changes.
            </p>
          </div>

          {/* Success state */}
          {isSubmitted ? (
            <div className="max-w-2xl">
              <div className="border border-border rounded-sm p-10 bg-card text-center">
                <div className="w-14 h-14 rounded-sm bg-brand-secondary-muted flex items-center justify-center mx-auto mb-6">
                  <Check
                    size={24}
                    className="text-brand-secondary"
                    aria-hidden="true"
                  />
                </div>
                <h2
                  className="text-2xl font-light text-foreground mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Intake Complete
                </h2>
                <p className="text-muted-foreground font-light mb-8 max-w-md mx-auto">
                  Your information has been submitted successfully. You will be
                  connected with a licensed provider shortly.
                </p>
                <Link
                  href="/consultation/waiting-room"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background text-[11px] tracking-[0.15em] uppercase font-light hover:bg-foreground/90 transition-all duration-300 rounded-sm"
                >
                  Enter Waiting Room
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-8">
              {/* Review sections */}
              {REVIEW_SECTIONS.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <section
                    key={section.title}
                    className="border border-border rounded-sm bg-card overflow-hidden"
                  >
                    {/* Section header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <SectionIcon
                          size={16}
                          className="text-brand-secondary"
                          aria-hidden="true"
                        />
                        <h2
                          className="text-base font-light text-foreground"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {section.title}
                        </h2>
                      </div>
                      <Link
                        href={section.href}
                        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-brand-secondary uppercase font-light hover:text-brand-secondary-hover transition-colors"
                      >
                        <Pencil size={12} aria-hidden="true" />
                        Edit
                      </Link>
                    </div>

                    {/* Section items */}
                    <div className="divide-y divide-border">
                      {section.items.map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 px-6 py-4"
                        >
                          <span className="text-xs tracking-wider text-muted-foreground uppercase font-light sm:w-40 sm:flex-shrink-0 sm:pt-0.5">
                            {item.label}
                          </span>
                          <span className="text-sm font-light text-foreground">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* HIPAA notice */}
              <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-sm">
                <ShieldCheck
                  size={18}
                  className="text-brand-secondary mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-light text-foreground">
                    HIPAA-Compliant Submission
                  </p>
                  <p className="text-xs text-muted-foreground font-light mt-1">
                    Your health information is protected under HIPAA. All data is
                    encrypted in transit and at rest. Only your assigned provider
                    will have access to your intake information.
                  </p>
                </div>
              </div>

              {/* Final consent */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="final-consent"
                  checked={finalConsent}
                  onChange={(e) => setFinalConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary accent-brand-secondary"
                />
                <label
                  htmlFor="final-consent"
                  className="text-sm text-muted-foreground font-light leading-relaxed cursor-pointer"
                >
                  I certify that the information provided is accurate and
                  complete to the best of my knowledge. I consent to receiving
                  telehealth services from a licensed healthcare provider. I
                  understand that telehealth is not a substitute for emergency
                  care. I have reviewed and agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-brand-secondary hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/hipaa"
                    className="text-brand-secondary hover:underline"
                  >
                    HIPAA Notice of Privacy Practices
                  </Link>
                  .
                </label>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-border">
                <Link
                  href="/intake/id-verification"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-sm"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back
                </Link>
                <Button
                  onClick={handleSubmit}
                  disabled={!finalConsent || isSubmitting}
                  className={`inline-flex items-center gap-2 px-8 py-3 text-[11px] tracking-[0.15em] uppercase font-light rounded-sm h-auto transition-all duration-300 ${
                    finalConsent
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting
                    </>
                  ) : (
                    <>
                      Submit Intake
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
