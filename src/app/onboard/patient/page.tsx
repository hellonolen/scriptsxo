"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionCookie, setSessionCookie } from "@/lib/auth";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SITECONFIG, term } from "@/lib/config";

type VerifyStep = "consent" | "verifying" | "verified" | "failed";

export default function PatientOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<VerifyStep>("consent");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  const initVerification = useAction(
    api.actions.credentialVerificationOrchestrator.initializeVerification
  );
  const initPatient = useAction(
    api.agents.credentialVerificationAgent.initPatientVerification
  );
  const checkPatient = useAction(
    api.agents.credentialVerificationAgent.checkPatientVerification
  );
  const finalizeVerification = useAction(
    api.actions.credentialVerificationOrchestrator.finalizeVerification
  );
  useEffect(() => {
    const dev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    setIsDev(dev);

    const sessionData = getSessionCookie();
    if (!sessionData) {
      router.push("/");
      return;
    }
    setSession(sessionData);
  }, [router]);

  const member = useQuery(
    api.members.getByEmail,
    session?.email ? { email: session.email } : "skip"
  );

  useEffect(() => {
    if (member?._id) {
      setMemberId(member._id);
    }
  }, [member]);

  async function handleVerify() {
    if (!consent) return;
    setLoading(true);
    setError("");

    try {
      // Dev mode: simulate verification with direct role assignment
      if (isDev) {
        setStep("verifying");
        // Short delay to simulate
        await new Promise((r) => setTimeout(r, 1500));
        const updatedSession = { ...session, role: "patient" };
        setSessionCookie(updatedSession);
        setStep("verified");
        setLoading(false);
        return;
      }

      // Production: Stripe Identity
      if (!memberId) {
        setError("Account not ready. Please try again.");
        setLoading(false);
        return;
      }

      // Initialize verification
      const initResult = await initVerification({
        memberId,
        email: session.email,
        selectedRole: "patient",
      });
      setVerificationId(initResult.verificationId);

      // Create Stripe Identity session
      setStep("verifying");
      const stripeResult = await initPatient({
        verificationId: initResult.verificationId,
        email: session.email,
        memberId,
      });

      // Load Stripe and open Identity modal
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );

      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      const { error: stripeError } = await stripe.verifyIdentity(
        stripeResult.clientSecret
      );

      if (stripeError) {
        setStep("failed");
        setError(stripeError.message || "Verification cancelled");
        setLoading(false);
        return;
      }

      // Check verification result
      const statusResult = await checkPatient({
        verificationId: initResult.verificationId,
        stripeSessionId: stripeResult.sessionId,
      });

      if (statusResult.verified) {
        // Finalize
        const finalResult = await finalizeVerification({
          verificationId: initResult.verificationId,
          memberId,
        });

        if (finalResult.success) {
          const updatedSession = { ...session, role: "patient" };
          setSessionCookie(updatedSession);
          setStep("verified");
        } else {
          setStep("failed");
          setError("Identity could not be confirmed.");
        }
      } else {
        setStep("failed");
        setError("Verification was not completed. Please try again.");
      }
    } catch (err) {
      setStep("failed");
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center px-6 bg-background">
        <span className="text-[11px] tracking-[0.25em] text-foreground font-light uppercase">
          {SITECONFIG.brand.name}
        </span>
        <span className="mx-4 text-border">|</span>
        <span className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase font-light">
          {term("title")} Verification
        </span>
      </div>

      <div className="max-w-lg mx-auto px-6 py-16">
        {isDev && step !== "verified" && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium">
            DEV MODE
          </div>
        )}

        {/* CONSENT */}
        {step === "consent" && (
          <div className="space-y-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Identity Verification
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Federal regulations require identity verification for telehealth prescriptions.
                {isDev
                  ? " In dev mode, this is simulated."
                  : " We use Stripe Identity for secure, HIPAA-compliant verification."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
                <ScanLine size={18} className="text-[#2DD4BF] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">What you will need</p>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    A government-issued photo ID (driver's license, passport, or state ID) and the ability to take a quick selfie for face matching.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
                <ShieldCheck size={18} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Your data is secure</p>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    Stripe handles verification using bank-level encryption. Your ID images are never shared. ScriptsXO only receives a pass/fail status.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded-sm border-border accent-[#7C3AED]"
              />
              <label
                htmlFor="consent"
                className="text-sm text-muted-foreground font-light leading-relaxed cursor-pointer"
              >
                I consent to verifying my identity through Stripe Identity for telehealth services.
              </label>
            </div>

            <Button
              onClick={handleVerify}
              className="w-full"
              size="lg"
              disabled={!consent || loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {loading ? "Starting..." : "Verify Identity"}
            </Button>

            <button
              onClick={() => router.push("/onboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-2"
            >
              <ArrowLeft size={13} />
              Choose a different role
            </button>
          </div>
        )}

        {/* VERIFYING */}
        {step === "verifying" && (
          <div className="text-center py-20 space-y-6">
            <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-sm text-muted-foreground font-light">
                {isDev ? "Simulating verification..." : "Verifying your identity..."}
              </p>
            </div>
          </div>
        )}

        {/* VERIFIED */}
        {step === "verified" && (
          <div className="text-center py-12 space-y-8">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
            >
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Identity Verified
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                Your identity has been confirmed. You now have full access to the {term()} portal.
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard")} size="lg">
              Go to Dashboard
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* FAILED */}
        {step === "failed" && (
          <div className="text-center py-12 space-y-8">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-destructive/10">
              <XCircle size={28} className="text-destructive" />
            </div>
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Verification Failed
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                {error || "Verification could not be completed. Please try again."}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setStep("consent");
                  setError("");
                  setConsent(false);
                }}
                variant="outline"
              >
                Try Again
              </Button>
              <Button
                onClick={() => {
                  window.location.href = `mailto:${SITECONFIG.brand.supportEmail}?subject=${term("title")} Verification Issue`;
                }}
                variant="outline"
              >
                Contact Support
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
