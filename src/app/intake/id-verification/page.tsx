"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Lock
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

  const currentStep = 2; // Verification step is index 2

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
                    Identity Verification
                  </h1>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Federal and state regulations require identity verification for telehealth prescriptions.
                  </p>

                  {isDevMode && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-xs font-medium">
                      <ScanLine size={14} />
                      DEV MODE: SIMULATED APP
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
              <div className="space-y-10">

                {/* Status Panels */}
                <AnimatePresence mode="wait">
                  {verificationStatus === "verified" && (
                    <motion.div
                      key="verified-status"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-green-500/20 bg-green-500/5 rounded-2xl p-8 backdrop-blur-sm"
                    >
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 size={32} className="text-green-500" />
                        </div>
                        <div>
                          <h2
                            className="text-2xl font-light text-foreground mb-3"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            Identity Verified
                          </h2>
                          <p className="text-muted-foreground font-light leading-relaxed max-w-sm mx-auto">
                            Your identity has been successfully verified. You can now proceed to review your intake information.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {verificationStatus === "failed" && (
                    <motion.div
                      key="failed-status"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-destructive/20 bg-destructive/5 rounded-2xl p-6 backdrop-blur-sm"
                    >
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <XCircle size={32} className="text-destructive" />
                        </div>
                        <div>
                          <h2
                            className="text-2xl font-light text-foreground mb-3"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            Verification Failed
                          </h2>
                          <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                            {errorMessage || "Verification could not be completed. Please try again."}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {verificationStatus === "idle" && (
                    <motion.div
                      key="idle-instructions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm">
                        <h2
                          className="text-xl font-light text-foreground mb-6"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          What to Expect
                        </h2>

                        <div className="space-y-6">
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center flex-shrink-0 text-brand-secondary text-sm">1</div>
                            <div>
                              <p className="text-foreground font-light mb-1">Stripe Identity Process</p>
                              <p className="text-sm text-muted-foreground font-light leading-relaxed">Click "Verify Identity" to securely open the Stripe Identity verification portal.</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center flex-shrink-0 text-brand-secondary text-sm">2</div>
                            <div>
                              <p className="text-foreground font-light mb-1">ID Scan</p>
                              <p className="text-sm text-muted-foreground font-light leading-relaxed">Upload a front and back photo of your government-issued ID (driver's license, passport, or state ID).</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center flex-shrink-0 text-brand-secondary text-sm">3</div>
                            <div>
                              <p className="text-foreground font-light mb-1">Selfie Match</p>
                              <p className="text-sm text-muted-foreground font-light leading-relaxed">Take a quick selfie using your device's camera to match your ID photo.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security Notice */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-6 bg-[#7C3AED]/[0.02] border border-[#7C3AED]/20 rounded-2xl text-center sm:text-left">
                        <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] flex-shrink-0">
                          <Lock size={20} />
                        </div>
                        <div>
                          <p className="text-foreground font-medium text-sm mb-1">Bank-level Security</p>
                          <p className="text-xs text-muted-foreground font-light leading-relaxed">
                            Verification is processed securely by Stripe. Your data is encrypted and HIPAA-compliant. ScriptsXO only receives a verification success status and does not store your ID images.
                          </p>
                        </div>
                      </div>

                      {/* Consent Checkbox */}
                      <div
                        className="group relative flex items-start gap-4 p-6 border border-border hover:border-brand-secondary/40 bg-card hover:bg-muted/50 transition-colors rounded-2xl cursor-pointer"
                        onClick={() => setConsent(!consent)}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${consent ? "border-brand-secondary bg-brand-secondary" : "border-muted-foreground/30 bg-background"}`}>
                            <CheckCircle2 size={14} className={`text-white transition-opacity ${consent ? "opacity-100" : "opacity-0"}`} />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground font-light leading-relaxed select-none">
                          I confirm that the identity documents I provide are authentic and belong to me. I consent to ScriptsXO verifying my identity through Stripe Identity for the purpose of telehealth consultation and prescription services.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-8"
                >
                  <button
                    onClick={() => router.push("/intake/medical-history")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-border text-foreground text-xs tracking-wider uppercase font-light hover:bg-muted transition-colors rounded-xl"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>

                  <div className="w-full sm:w-auto">
                    {verificationStatus === "verified" ? (
                      <button
                        onClick={handleContinue}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-secondary text-white text-xs tracking-wider uppercase font-light hover:bg-brand-secondary/90 transition-all shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.23)] rounded-xl"
                      >
                        Continue to Payment
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    ) : verificationStatus === "verifying" ? (
                      <div className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-muted text-muted-foreground text-xs tracking-wider uppercase font-light rounded-xl border border-border">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Verifying...
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyIdentity();
                        }}
                        disabled={!consent}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-xs tracking-wider uppercase font-light rounded-xl transition-all duration-300 ${consent
                            ? "bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/10"
                            : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                          }`}
                      >
                        Verify Identity
                        <ShieldCheck size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </motion.div>

              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
