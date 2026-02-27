"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Stethoscope,
  ScanLine,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Shield,
  Loader2,
  Clock,
  UserCheck,
  Pill,
  Building2,
  CalendarCheck,
  X,
  CreditCard,
  CheckCircle2,
  Check
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SITECONFIG, formatPrice } from "@/lib/config";
import { getSessionCookie } from "@/lib/auth";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { isDev, DevIntakeStore } from "@/lib/dev-helpers";

const WhopCheckoutEmbed = dynamic(
  () => import("@whop/checkout/react").then((mod) => mod.WhopCheckoutEmbed),
  { ssr: false }
);

const INTAKE_STEPS = [
  { label: "Symptoms", icon: Stethoscope },
  { label: "Medical History", icon: Heart },
  { label: "Verification", icon: ScanLine },
  { label: "Payment", icon: CreditCard },
  { label: "Review", icon: FileCheck },
] as const;

const INCLUDED_FEATURES = [
  { icon: UserCheck, label: "Health Screening" },
  { icon: Clock, label: "Licensed Provider Review" },
  { icon: Pill, label: "E-Prescription" },
  { icon: Building2, label: "Pharmacy Coordination" },
  { icon: CalendarCheck, label: "Unlimited Consultations" },
];

export default function IntakePaymentPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="min-h-screen pt-28 pb-24 px-6 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
          </div>
        </AppShell>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  const createCheckoutSession = useAction(api.actions.whopCheckout.createCheckoutSession);
  const verifyMembership = useAction(api.actions.whopCheckout.verifyMembership);

  const currentStep = 3; // Payment step is index 3

  useEffect(() => {
    const devMode = isDev();
    setIsDevMode(devMode);

    if (devMode) {
      setLoading(false);
      return;
    }

    const whopCheckout = searchParams.get("whop_checkout");
    if (whopCheckout === "success") {
      handlePostPayment();
      return;
    }

    initCheckout();
  }, [searchParams]);

  async function initCheckout() {
    try {
      const session = getSessionCookie();
      if (!session?.email) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      const result = await createCheckoutSession({
        patientEmail: session.email,
        sessionToken: session.sessionToken || ""
      });

      setSessionId(result.sessionId);
    } catch (err: any) {
      setError(err.message || "Failed to initialize checkout");
    } finally {
      setLoading(false);
    }
  }

  async function handlePostPayment() {
    setCompleted(true);
    try {
      const session = getSessionCookie();
      if (!session?.email) {
        router.push("/access");
        return;
      }
      await verifyMembership({ patientEmail: session.email, sessionToken: session.sessionToken || "" });
    } catch {
      // Webhook fallback
    }
    setTimeout(() => {
      router.push("/intake/review");
    }, 1500);
  }

  function handleCheckoutComplete() {
    setCompleted(true);
    const session = getSessionCookie();
    if (session?.email) {
      verifyMembership({ patientEmail: session.email, sessionToken: session.sessionToken || "" }).catch(() => { });
    }
    setTimeout(() => {
      router.push("/intake/review");
    }, 1500);
  }

  /** Dev mode simulation */
  function handleDevPayment() {
    const session = getSessionCookie();
    if (!session?.email) {
      router.push("/");
      return;
    }
    DevIntakeStore.create(session.email);
    setCompleted(true);
    setTimeout(() => {
      router.push("/intake/review");
    }, 1200);
  }

  if (completed) {
    return (
      <AppShell>
        <div className="min-h-screen pt-28 pb-24 px-6 flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-card border border-border rounded-2xl p-12 shadow-sm max-w-md w-full"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2
              className="text-3xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Payment Successful
            </h2>
            <p className="text-muted-foreground font-light mb-8">
              Membership activated. Proceeding to review...
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-brand-secondary mx-auto" />
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
                    Start Your Membership
                  </h1>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Join ScriptsXO for unlimited telehealth consultations with licensed providers. Cancel anytime.
                  </p>

                  {isDevMode && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-xs font-medium">
                      <CreditCard size={14} />
                      DEV MODE: SIMULATED PAYMENT
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

                {error && (
                  <div className="border border-destructive/20 bg-destructive/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <X className="w-5 h-5 text-destructive" />
                      <p className="text-sm font-light text-destructive">{error}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 xl:gap-10">
                  {/* Checkout Panel */}
                  <div className="xl:col-span-3">
                    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm h-full flex flex-col">
                      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                        <h2
                          className="text-xl font-light text-foreground"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Complete Payment
                        </h2>
                        <div className="text-right">
                          <p
                            className="text-3xl font-light text-foreground leading-none"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {formatPrice(SITECONFIG.billing.membershipFee)}
                          </p>
                          <p className="text-xs text-muted-foreground font-light mt-1 uppercase tracking-wider">
                            per month
                          </p>
                        </div>
                      </div>

                      {/* Payment Area */}
                      <div className="flex-grow flex flex-col justify-center min-h-[300px]">
                        {isDevMode ? (
                          <div className="text-center space-y-6">
                            <p className="text-sm text-muted-foreground font-light leading-relaxed">
                              Payment gateway is not available in development. Click below to simulate membership activation.
                            </p>
                            <button
                              onClick={handleDevPayment}
                              className="px-8 py-4 bg-brand-secondary text-white text-xs tracking-wider uppercase font-light rounded-xl hover:bg-brand-secondary/90 transition-all shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.23)]"
                            >
                              Activate Membership (Dev)
                            </button>
                          </div>
                        ) : loading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
                          </div>
                        ) : sessionId ? (
                          <div className="relative z-10">
                            <WhopCheckoutEmbed
                              sessionId={sessionId}
                              theme="light"
                              skipRedirect
                              onComplete={handleCheckoutComplete}
                              themeOptions={{ accentColor: "violet" }}
                              returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/intake/review?whop_checkout=success`}
                              fallback={
                                <div className="flex items-center justify-center py-16">
                                  <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
                                </div>
                              }
                            />
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground font-light">
                              Unable to load checkout. Please refresh the page.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-border flex items-start gap-4">
                        <Shield className="w-5 h-5 text-brand-secondary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground font-light leading-relaxed">
                          Secure, encrypted payment processed by Whop. We never store your card details on our servers.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Included Features Panel */}
                  <div className="xl:col-span-2">
                    <div className="bg-[#7C3AED]/[0.02] border border-[#7C3AED]/20 rounded-2xl p-8 h-full">
                      <h3 className="text-sm font-medium text-foreground mb-6 flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand-secondary" />
                        What&apos;s Included
                      </h3>
                      <div className="space-y-5">
                        {INCLUDED_FEATURES.map((feature) => (
                          <div key={feature.label} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0">
                              <feature.icon className="w-4 h-4 text-brand-secondary" />
                            </div>
                            <span className="text-sm text-muted-foreground font-light leading-snug">
                              {feature.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-6 border-t border-border">
                        <div className="flex items-start gap-3">
                          <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">
                              Cancel Anytime
                            </p>
                            <p className="text-xs text-muted-foreground font-light leading-relaxed">
                              No contracts, no commitment. Manage your membership easily.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-8 border-t border-border/50"
                >
                  <button
                    onClick={() => router.push("/intake/id-verification")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-border text-foreground text-xs tracking-wider uppercase font-light hover:bg-muted transition-colors rounded-xl"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>

                  <p className="text-xs text-muted-foreground font-light px-6">
                    Next: Review & Submit
                  </p>
                </motion.div>

              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
