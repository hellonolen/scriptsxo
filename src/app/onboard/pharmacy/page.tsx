"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, Building2, ShieldCheck, Package } from "lucide-react";
import { SITECONFIG } from "@/lib/config";

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1, label: "Pharmacy" },
  { id: 2, label: "Credentials" },
  { id: 3, label: "Review" },
] as const;

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
                      color: isActive ? "var(--brand-secondary)" : "var(--muted-foreground)",
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
                style={{ background: isComplete ? "var(--brand)" : "var(--border)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PharmacyOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Pharmacy Info
  const [pharmacyName, setPharmacyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 — Credentials
  const [ncpdpId, setNcpdpId] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [deaNumber, setDeaNumber] = useState("");

  function goNext() {
    if (step < 3) setStep((step + 1) as Step);
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
          Pharmacy Onboarding
        </span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="mb-10">
          <StepIndicator current={step} />
        </div>

        {/* Step 1: Pharmacy Info */}
        {step === 1 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 1</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Pharmacy Information
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Tell us about your pharmacy and the primary contact.
              </p>

              <div className="space-y-5">
                <div>
                  <label style={labelStyle}>Pharmacy Name</label>
                  <input
                    type="text"
                    placeholder="Main Street Pharmacy"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Contact Name</label>
                    <input
                      type="text"
                      placeholder="Jane Doe, PharmD"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Email</label>
                    <input
                      type="email"
                      placeholder="pharmacy@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="(305) 555-0100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                  />
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
                Your NCPDP ID or Pharmacy NPI will be verified against federal registries.
              </p>

              <div className="space-y-5">
                <div>
                  <label style={labelStyle}>NCPDP Provider ID</label>
                  <input
                    type="text"
                    placeholder="1234567"
                    value={ncpdpId}
                    onChange={(e) =>
                      setNcpdpId(e.target.value.replace(/\D/g, "").slice(0, 7))
                    }
                    maxLength={7}
                    style={inputStyle}
                  />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span className="text-xs font-light text-muted-foreground">or</span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>

                <div>
                  <label style={labelStyle}>Pharmacy NPI Number</label>
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
                  <label style={labelStyle}>DEA Registration Number (optional)</label>
                  <input
                    type="text"
                    placeholder="AB1234567"
                    value={deaNumber}
                    onChange={(e) =>
                      setDeaNumber(e.target.value.toUpperCase().slice(0, 9))
                    }
                    maxLength={9}
                    style={inputStyle}
                  />
                </div>

                <div
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{
                    background: "var(--brand-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Package
                    size={15}
                    style={{ color: "var(--brand-secondary)", flexShrink: 0, marginTop: 1 }}
                  />
                  <p className="text-xs font-light text-muted-foreground leading-relaxed">
                    Provide either your NCPDP ID or pharmacy NPI. Credentials will be verified
                    before prescription routing access is granted.
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
                  disabled={!ncpdpId && !npiNumber}
                  className="btn-gradient inline-flex items-center gap-2"
                  style={{
                    position: "relative",
                    zIndex: 0,
                    opacity: !ncpdpId && !npiNumber ? 0.5 : 1,
                    cursor: !ncpdpId && !npiNumber ? "not-allowed" : "pointer",
                  }}
                >
                  Review Application
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="glass-card animate-fade-in-up">
            <div style={{ padding: "2rem" }}>
              <span className="eyebrow" style={{ color: "var(--brand-secondary)" }}>Step 3</span>
              <h2
                className="text-2xl font-light mt-2 mb-1"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
              >
                Review and Submit
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-8">
                Confirm your information before submitting for credential verification.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { label: "Pharmacy", value: pharmacyName || "—" },
                  { label: "Contact", value: contactName || "—" },
                  { label: "Email", value: contactEmail || "—" },
                  { label: "Phone", value: phone || "—" },
                  {
                    label: "NCPDP / NPI",
                    value: ncpdpId
                      ? `NCPDP ${ncpdpId}`
                      : npiNumber
                      ? `NPI ${npiNumber}`
                      : "—",
                  },
                  ...(deaNumber ? [{ label: "DEA", value: deaNumber }] : []),
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 px-4 rounded-lg"
                    style={{ background: "var(--brand-muted)", border: "1px solid var(--border)" }}
                  >
                    <span
                      className="text-[10px] tracking-widest uppercase font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {label}
                    </span>
                    <span className="text-sm font-light text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="space-y-2 mb-6">
                {[
                  { icon: ShieldCheck, text: "Verified against NCPDP and CMS registries" },
                  { icon: Building2, text: "Prescription routing enabled after approval" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={14} style={{ color: "var(--brand-secondary)", flexShrink: 0 }} />
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
                <button
                  onClick={() => router.push("/")}
                  className="btn-gradient inline-flex items-center gap-2"
                  style={{ position: "relative", zIndex: 0 }}
                >
                  Submit for Verification
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
