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
  ShieldCheck,
  CheckCircle2,
  XCircle,
  CreditCard,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";
import { loadStripe } from "@stripe/stripe-js";
import { isDev, DevIntakeStore } from "@/lib/dev-helpers";

const INTAKE_STEPS = [
  { label: "Symptoms", icon: Stethoscope },
  { label: "Medical History", icon: Heart },
  { label: "Verification", icon: ScanLine },
  { label: "Payment", icon: CreditCard },
  { label: "Review", icon: FileCheck },
] as const;

export default function IDVerificationPage() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isDevMode, setIsDevMode] = useState(false);

  const createVerificationSession = useAction(api.actions.stripeIdentity.createVerificationSession);
  const checkVerificationStatus = useAction(api.actions.stripeIdentity.checkVerificationStatus);

  const currentStep = 2;

  useEffect(() => {
    setIsDevMode(isDev());
    const storedIntakeId = isDev()
      ? DevIntakeStore.getId()
      : localStorage.getItem("sxo_intake_id");
    if (!storedIntakeId) {
      router.push("/intake/medical-history");
    }
  }, [router]);

  /** Dev mode: simulate identity verification */
  function handleDevVerify() {
    setVerificationStatus("verifying");
    setTimeout(() => {
      DevIntakeStore.updateStep("id_verification", true);
      setVerificationStatus("verified");
    }, 1500);
  }

  async function handleVerifyIdentity() {
    if (!consent) return;

    // Dev mode: simulate verification
    if (isDevMode) {
      handleDevVerify();
      return;
    }

    const session = getSessionCookie();
    if (!session?.email) {
      setErrorMessage("No session found. Please sign in again.");
      return;
    }

    setVerificationStatus("verifying");
    setErrorMessage("");

    try {
      // Create Stripe Identity session
      const { verificationSessionId, clientSecret } = await createVerificationSession({
        patientEmail: session.email,
      });

      setSessionId(verificationSessionId);

      // Load Stripe.js
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      // Open Stripe Identity modal
      const { error } = await stripe.verifyIdentity(clientSecret);

      if (error) {
        setVerificationStatus("failed");
        setErrorMessage(error.message || "Verification failed");
        return;
      }

      // Check verification status
      const result = await checkVerificationStatus({
        verificationSessionId,
        patientEmail: session.email,
      });

      if (result.success) {
        setVerificationStatus("verified");
      } else {
        setVerificationStatus("failed");
        setErrorMessage((result.lastError as any)?.message || "Verification was not completed");
      }
    } catch (err) {
      setVerificationStatus("failed");
      setErrorMessage(err instanceof Error ? err.message : "Verification failed");
    }
  }

  function handleContinue() {
    router.push("/intake/payment");
  }

  return (
    <AppShell>
      <main className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Progress bar */}
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] tracking-[0.2em] text-brand-secondary uppercase font-light">
                Step 3 of 5
              </span>
            </div>
            <div className="w-full h-px bg-border relative">
              <div
                className="absolute top-0 left-0 h-px bg-brand-secondary transition-all duration-500"
                style={{ width: "60%" }}
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
              Identity Verification
            </h1>
            <p className="text-muted-foreground font-light">
              Federal and state regulations require identity verification for telehealth prescriptions.
              {isDevMode
                ? " In dev mode, verification is simulated automatically."
                : " We use Stripe Identity for secure, HIPAA-compliant verification."}
            </p>
            {isDevMode && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium">
                DEV MODE
              </div>
            )}
          </div>

          {/* Content */}
          <div className="max-w-2xl space-y-10">
            {/* Verification status display */}
            {verificationStatus === "verified" && (
              <div className="border border-green-500 rounded-md p-6 bg-green-50">
                <div className="flex items-start gap-4">
                  <CheckCircle2 size={24} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2
                      className="text-lg font-light text-green-900 mb-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Identity Verified
                    </h2>
                    <p className="text-sm text-green-800 font-light">
                      Your identity has been successfully verified. You can now proceed to review your intake.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === "failed" && (
              <div className="border border-destructive rounded-md p-6 bg-destructive/5">
                <div className="flex items-start gap-4">
                  <XCircle size={24} className="text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h2
                      className="text-lg font-light text-destructive mb-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Verification Failed
                    </h2>
                    <p className="text-sm text-destructive font-light">
                      {errorMessage || "Verification could not be completed. Please try again."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification explanation */}
            {verificationStatus === "idle" && (
              <section className="space-y-6">
                <div>
                  <h2
                    className="text-lg font-light text-foreground mb-1"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    What to Expect
                  </h2>
                  <div className="h-px bg-border mb-4" />
                  <ul className="space-y-3 text-sm text-muted-foreground font-light">
                    <li className="flex gap-3">
                      <span className="text-brand-secondary">1.</span>
                      <span>Click "Verify Identity" to open the Stripe Identity modal</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-brand-secondary">2.</span>
                      <span>Upload a photo of your government-issued ID (driver's license, passport, or state ID)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-brand-secondary">3.</span>
                      <span>Take a selfie to match your ID photo</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-brand-secondary">4.</span>
                      <span>Verification typically completes in seconds</span>
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {/* Security notice */}
            <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-md">
              <ShieldCheck
                size={18}
                className="text-brand-secondary mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-light text-foreground">
                  Your identity data is encrypted and HIPAA-compliant
                </p>
                <p className="text-xs text-muted-foreground font-light mt-1">
                  Stripe Identity handles verification using bank-level encryption. Your ID images are stored securely and never shared with third parties. ScriptsXO only receives a verification status.
                </p>
              </div>
            </div>

            {/* Consent */}
            {verificationStatus === "idle" && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="id-consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary accent-brand-secondary"
                />
                <label
                  htmlFor="id-consent"
                  className="text-sm text-muted-foreground font-light leading-relaxed cursor-pointer"
                >
                  I confirm that the identity documents I provide are authentic and belong to me. I consent to ScriptsXO verifying my identity through Stripe Identity for the purpose of telehealth consultation and prescription services.
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-border">
              <button
                onClick={() => router.push("/intake/medical-history")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>

              {verificationStatus === "verified" ? (
                <button
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background text-[11px] tracking-[0.15em] uppercase font-light hover:bg-foreground/90 transition-all duration-300 rounded-md"
                >
                  Continue to Payment
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : verificationStatus === "verifying" ? (
                <div className="inline-flex items-center gap-2 px-8 py-3 bg-muted text-muted-foreground text-[11px] tracking-[0.15em] uppercase font-light rounded-md">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Verifying...
                </div>
              ) : (
                <button
                  onClick={handleVerifyIdentity}
                  disabled={!consent}
                  className={`inline-flex items-center gap-2 px-8 py-3 text-[11px] tracking-[0.15em] uppercase font-light rounded-md transition-all duration-300 ${
                    consent
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Verify Identity
                  <ShieldCheck size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
