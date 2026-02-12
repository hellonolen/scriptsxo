import type { Metadata } from "next";
import Link from "next/link";
import {
  UserPlus,
  RefreshCw,
  ArrowRight,
  Heart,
  Stethoscope,
  ScanLine,
  FileCheck,
} from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Patient Intake",
  description:
    "Complete your patient intake to begin your telehealth consultation.",
};

const INTAKE_STEPS = [
  { label: "Medical History", icon: Heart },
  { label: "Symptoms", icon: Stethoscope },
  { label: "Verification", icon: ScanLine },
  { label: "Review", icon: FileCheck },
] as const;

export default function IntakePage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Welcome header */}
          <div className="max-w-2xl mb-16">
            <p className="text-[11px] tracking-[0.2em] text-brand-secondary uppercase font-light mb-4">
              Welcome to ScriptsXO
            </p>
            <h1
              className="text-4xl lg:text-5xl font-light text-foreground mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your Health Journey
              <br />
              Begins Here
            </h1>
            <p className="text-muted-foreground font-light leading-relaxed max-w-lg">
              We have designed a simple, four-step intake process to ensure your
              provider has everything they need for a thoughtful, personalized
              consultation.
            </p>
          </div>

          {/* Progress stepper */}
          <div className="mb-16">
            <div className="flex items-center gap-0 max-w-2xl">
              {INTAKE_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.label} className="flex items-center flex-1 last:flex-0">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-sm border border-border bg-card flex items-center justify-center">
                        <StepIcon
                          size={16}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-[10px] tracking-[0.1em] text-muted-foreground uppercase font-light hidden sm:block">
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

          {/* Two-path cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {/* New Patient */}
            <Link
              href="/intake/medical-history"
              className="group relative bg-card border border-border rounded-sm p-8 lg:p-10 transition-all duration-300 hover:border-brand-secondary/40 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-sm bg-brand-secondary-muted flex items-center justify-center mb-6">
                <UserPlus
                  size={20}
                  className="text-brand-secondary"
                  aria-hidden="true"
                />
              </div>
              <h2
                className="text-2xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                New Patient
              </h2>
              <p className="text-sm text-muted-foreground font-light leading-relaxed mb-8">
                First visit? We will guide you through a complete intake
                covering your medical history, current concerns, and identity
                verification.
              </p>
              <div className="flex items-center gap-2 text-[11px] tracking-[0.15em] text-brand-secondary uppercase font-light">
                Begin Intake
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>

            {/* Returning Patient */}
            <Link
              href="/intake/symptoms"
              className="group relative bg-card border border-border rounded-sm p-8 lg:p-10 transition-all duration-300 hover:border-brand-secondary/40 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-sm bg-primary/5 flex items-center justify-center mb-6">
                <RefreshCw
                  size={20}
                  className="text-foreground/60"
                  aria-hidden="true"
                />
              </div>
              <h2
                className="text-2xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Returning Patient
              </h2>
              <p className="text-sm text-muted-foreground font-light leading-relaxed mb-8">
                Welcome back. Skip directly to describing your current symptoms
                and we will have you seen by a provider shortly.
              </p>
              <div className="flex items-center gap-2 text-[11px] tracking-[0.15em] text-muted-foreground uppercase font-light">
                Describe Symptoms
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
