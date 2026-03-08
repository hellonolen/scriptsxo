"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, ShieldCheck, CreditCard } from "lucide-react";
import { SITECONFIG, term } from "@/lib/config";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Health" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Ready" },
] as const;

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, idx) => {
        const isComplete = s.id < current;
        const isActive = s.id === current;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: isComplete
                    ? "var(--brand)"
                    : isActive
                    ? "var(--brand-secondary)"
                    : "var(--border)",
                  background: isComplete
                    ? "var(--brand)"
                    : isActive
                    ? "var(--brand-secondary-muted)"
                    : "transparent",
                }}
              >
                {isComplete ? (
                  <Check size={13} style={{ color: "white", strokeWidth: 2.5 }} />
                ) : (
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: isActive
                        ? "var(--brand-secondary)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {s.id}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] tracking-wide uppercase font-light hidden sm:block"
                style={{
                  color: isActive
                    ? "var(--brand-secondary)"
                    : "var(--muted-foreground)",
                }}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3 mb-5 sm:mb-0 transition-all duration-300"
                style={{
                  background: isComplete ? "var(--brand)" : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PatientOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Account
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [state, setState] = useState("");

  // Step 2 — Health
  const [complaint, setComplaint] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");

  function goNext() {
    if (step < 4) setStep((step + 1) as Step);
  }

  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--background)",
    fontSize: 14,
    color: "var(--foreground)",
    outline: "none",
    fontFamily: "var(--font-sans)",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--foreground)",
    marginBottom: 6,
    display: "block",
    letterSpacing: "0.01em",
  };

  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Top bar */}
      <div
        className="h-14 flex items-center px-6"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--sidebar-background)" }}
      >
        <span
          className="eyebrow"
          style={{ color: "rgba(167,139,250,0.7)" }}
        >
          {SITECONFIG.brand.name}
        </span>
        <span className="mx-4 text-white/10">|</span>
        <span
          className="text-[11px] tracking-widest uppercase font-light"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {term("title")} Onboarding
        </span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Step indicator */}
        {step !== 4 && (
          <div className="mb-10">
            <StepIndicator current={step} />
          </div>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 1</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Your Account
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Basic information to set up your {term()} profile.
              </p>

              <div className="space-y-5">
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>State of Residence</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">Select a state...</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={goNext}
                  className="btn-gradient inline-flex items-center gap-2"
                  style={{ position: "relative", zIndex: 0 }}
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Health Snapshot */}
        {step === 2 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 2</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Health Snapshot
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Help your provider prepare before your consultation.
              </p>

              <div className="space-y-5">
                <div>
                  <label style={labelStyle}>Chief Complaint</label>
                  <textarea
                    placeholder="Describe your primary concern or what you need a prescription for..."
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Known Allergies</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Sulfa drugs — or None"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Current Medications</label>
                  <input
                    type="text"
                    placeholder="e.g. Metformin 500mg, Lisinopril — or None"
                    value={medications}
                    onChange={(e) => setMedications(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                className="flex justify-between mt-8 pt-6"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={13} />
                  Back
                </button>
                <button
                  onClick={goNext}
                  className="btn-gradient inline-flex items-center gap-2"
                  style={{ position: "relative", zIndex: 0 }}
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 3</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Consultation Fee
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Review the fee before proceeding to your secure checkout.
              </p>

              {/* Fee card */}
              <div
                className="rounded-xl p-6 mb-6"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--brand-muted)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-light text-foreground">Telehealth Consultation</span>
                  <span
                    className="text-2xl font-light"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--brand-secondary)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    $49
                  </span>
                </div>
                <p className="text-xs font-light text-muted-foreground leading-relaxed">
                  Includes a provider review of your health snapshot and, if appropriate, an e-prescription sent directly to your pharmacy of choice.
                </p>
              </div>

              {/* Trust signals */}
              <div className="space-y-3 mb-8">
                {[
                  { icon: ShieldCheck, text: "HIPAA-compliant and encrypted" },
                  { icon: CreditCard, text: "Secure payment via Stripe — no data stored" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={15} style={{ color: "var(--brand-secondary)", flexShrink: 0 }} />
                    <span className="text-xs font-light text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>

              <div
                className="flex justify-between pt-6"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={13} />
                  Back
                </button>
                <a
                  href="/start"
                  className="btn-gradient inline-flex items-center gap-2"
                  style={{ textDecoration: "none", position: "relative", zIndex: 0 }}
                >
                  Proceed to Payment
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Ready */}
        {step === 4 && (
          <div className="animate-fade-in-up text-center py-12">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{ background: "var(--brand)" }}
            >
              <Check size={28} strokeWidth={2.5} style={{ color: "white" }} />
            </div>
            <h1
              className="text-3xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.025em" }}
            >
              You are all set.
            </h1>
            <p className="text-sm font-light text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Your profile is ready. Begin your consultation and a licensed provider will review your case shortly.
            </p>
            <a
              href="/start"
              className="btn-gradient inline-flex items-center gap-2 mt-8"
              style={{ textDecoration: "none", position: "relative", zIndex: 0 }}
            >
              Start Your Consultation
              <ArrowRight size={14} />
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
