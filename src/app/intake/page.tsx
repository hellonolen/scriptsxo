"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const STEPS = [
  { number: "01", label: "Medical History" },
  { number: "02", label: "Symptoms" },
  { number: "03", label: "Verification" },
  { number: "04", label: "Review" },
] as const;

export default function IntakePage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* ---- HEADER ---- */}
        <header className="mb-16">
          <p className="eyebrow mb-3 text-[#7C3AED]">New Intake</p>
          <h1
            className="text-4xl lg:text-5xl font-light tracking-[-0.03em] leading-[0.95] text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Let&rsquo;s get <em className="text-[#7C3AED]">started</em>
          </h1>
          <p className="mt-6 text-muted-foreground font-light text-lg max-w-lg leading-relaxed">
            We&rsquo;ll walk you through a few steps to prepare for your
            consultation. It takes about 5 minutes.
          </p>
        </header>

        {/* ---- STEPS PREVIEW ---- */}
        <section className="border-t border-border pt-10 mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-16">
            {STEPS.map((step) => (
              <div key={step.number}>
                <span
                  className="text-3xl lg:text-4xl font-light text-foreground/20 block mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {step.number}
                </span>
                <span className="text-sm text-foreground font-light">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- PATHWAY SELECTION ---- */}
        <section>
          <p className="eyebrow mb-8 text-muted-foreground">Choose Your Path</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/intake/medical-history"
              className="glass-card group p-8 lg:p-10"
            >
              <h2
                className="text-2xl lg:text-3xl font-light text-foreground mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                New Patient
              </h2>
              <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-sm mb-8">
                First time with ScriptsXO? We&rsquo;ll collect your medical
                history, verify your identity, and run an AI screening.
              </p>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground group-hover:text-[#7C3AED] transition-colors font-light">
                Begin intake &rarr;
              </span>
            </Link>

            <Link
              href="/intake/symptoms"
              className="glass-card group p-8 lg:p-10"
            >
              <h2
                className="text-2xl lg:text-3xl font-light text-foreground mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Returning Patient
              </h2>
              <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-sm mb-8">
                Welcome back. Tell us about your current symptoms and
                we&rsquo;ll connect you with your AI concierge for a follow-up.
              </p>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground group-hover:text-[#7C3AED] transition-colors font-light">
                Describe symptoms &rarr;
              </span>
            </Link>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
