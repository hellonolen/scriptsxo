"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, Upload, Clock } from "lucide-react";
import { SITECONFIG } from "@/lib/config";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Credentials" },
  { id: 3, label: "Verification" },
  { id: 4, label: "Availability" },
  { id: 5, label: "Ready" },
] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

function StepIndicator({ current, total }: { current: Step; total: number }) {
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
                  color: isActive ? "var(--brand-secondary)" : "var(--muted-foreground)",
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

export default function ProviderOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Account
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [deaNumber, setDeaNumber] = useState("");

  // Step 2 — Credentials
  const [licensedStates, setLicensedStates] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState("");

  // Step 4 — Availability
  const [maxDailyReviews, setMaxDailyReviews] = useState(20);
  const [consultationRate, setConsultationRate] = useState("");

  function toggleState(s: string) {
    setLicensedStates((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function goNext() {
    if (step < 5) setStep((step + 1) as Step);
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
        <span className="eyebrow" style={{ color: "rgba(167,139,250,0.7)" }}>
          {SITECONFIG.brand.name}
        </span>
        <span className="mx-4 text-white/10">|</span>
        <span
          className="text-[11px] tracking-widest uppercase font-light"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Provider Onboarding
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step indicator */}
        {step !== 5 && (
          <div className="mb-10">
            <StepIndicator current={step} total={5} />
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
                Account Details
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Your professional contact information.
              </p>

              <div className="space-y-5">
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    placeholder="provider@practice.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Sarah Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>NPI Number</label>
                    <input
                      type="text"
                      placeholder="1234567890"
                      value={npiNumber}
                      onChange={(e) =>
                        setNpiNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      maxLength={10}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>DEA Number</label>
                    <input
                      type="text"
                      placeholder="AB1234567 (optional)"
                      value={deaNumber}
                      onChange={(e) =>
                        setDeaNumber(e.target.value.toUpperCase().slice(0, 9))
                      }
                      maxLength={9}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex justify-end mt-8 pt-6"
                style={{ borderTop: "1px solid var(--border)" }}
              >
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

        {/* Step 2: Credentials */}
        {step === 2 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 2</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Credentials
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Select the states where you hold an active license.{" "}
                {licensedStates.length > 0 && (
                  <span style={{ color: "var(--brand-secondary)" }}>
                    {licensedStates.length} selected
                  </span>
                )}
              </p>

              {/* State multi-select */}
              <div
                className="rounded-xl overflow-y-auto mb-6"
                style={{
                  border: "1px solid var(--border)",
                  maxHeight: 260,
                  background: "var(--background)",
                }}
              >
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 p-3">
                  {US_STATES.map((s) => {
                    const selected = licensedStates.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleState(s)}
                        className="text-[12px] font-medium py-1.5 px-2 rounded-md transition-all duration-150"
                        style={{
                          background: selected
                            ? "var(--brand-secondary)"
                            : "var(--brand-muted)",
                          color: selected ? "white" : "var(--foreground)",
                          border: selected
                            ? "1px solid var(--brand-secondary)"
                            : "1px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Specialties</label>
                <input
                  type="text"
                  placeholder="e.g. Family Medicine, Dermatology, Urgent Care"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  style={inputStyle}
                />
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

        {/* Step 3: Verification */}
        {step === 3 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 3</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                License Upload
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Upload a copy of your state medical license for verification.
              </p>

              {/* Upload placeholder */}
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-4 mb-6"
                style={{
                  border: "2px dashed var(--border)",
                  background: "var(--brand-muted)",
                  padding: "3rem 2rem",
                  cursor: "pointer",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--brand-secondary-muted)" }}
                >
                  <Upload size={20} style={{ color: "var(--brand-secondary)" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop your license here</p>
                  <p className="text-xs font-light text-muted-foreground mt-1">
                    PDF, JPG, or PNG — max 10 MB
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-4 py-2 rounded-lg"
                  style={{
                    background: "var(--brand-secondary-muted)",
                    color: "var(--brand-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Choose File
                </span>
              </div>

              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  background: "var(--brand-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <Clock size={15} style={{ color: "var(--brand-secondary)", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs font-light text-muted-foreground leading-relaxed">
                  Document upload is optional at this stage. Your NPI verification serves as the primary credential check. License documents can be added later in your provider settings.
                </p>
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

        {/* Step 4: Availability */}
        {step === 4 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 4</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Availability
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Set your daily capacity and consultation rate.
              </p>

              <div className="space-y-8">
                {/* Slider */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label style={labelStyle}>Max Daily Reviews</label>
                    <span
                      className="text-lg font-light tabular-nums"
                      style={{ fontFamily: "var(--font-heading)", color: "var(--brand-secondary)" }}
                    >
                      {maxDailyReviews}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={maxDailyReviews}
                    onChange={(e) => setMaxDailyReviews(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "var(--brand-secondary)",
                      cursor: "pointer",
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">5</span>
                    <span className="text-[10px] text-muted-foreground">50</span>
                  </div>
                </div>

                {/* Rate */}
                <div>
                  <label style={labelStyle}>Consultation Rate (optional)</label>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      style={{ pointerEvents: "none" }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={consultationRate}
                      onChange={(e) => setConsultationRate(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 28 }}
                      min={0}
                    />
                  </div>
                  <p className="text-xs font-light text-muted-foreground mt-2">
                    Per consultation. Leave blank to use platform default.
                  </p>
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
                  Submit Application
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Pending Review */}
        {step === 5 && (
          <div className="animate-fade-in-up text-center py-12">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{ background: "var(--brand)" }}
            >
              <Clock size={28} style={{ color: "white" }} />
            </div>
            <h1
              className="text-3xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.025em" }}
            >
              Application submitted.
            </h1>
            <p className="text-sm font-light text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Your credentials are under review. You will receive an email at{" "}
              <strong className="font-medium">{email || "your address"}</strong> within 24 hours with your access status.
            </p>

            <div
              className="mt-8 mx-auto max-w-xs rounded-xl p-5 text-left"
              style={{
                background: "var(--brand-muted)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-xs font-medium text-foreground mb-2">What happens next?</p>
              <ul className="space-y-1.5">
                {[
                  "NPI verified against NPPES registry",
                  "License documents reviewed",
                  "Access granted or follow-up sent",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check
                      size={11}
                      style={{ color: "var(--brand-secondary)", flexShrink: 0, marginTop: 3, strokeWidth: 2.5 }}
                    />
                    <span className="text-xs font-light text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 mt-8 text-sm font-light text-muted-foreground hover:text-foreground transition-colors"
            >
              Return to home
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
