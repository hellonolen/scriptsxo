"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionCookie, setSessionCookie } from "@/lib/auth";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SITECONFIG } from "@/lib/config";

type OnboardStep = "id" | "license" | "review" | "complete" | "rejected";

const STEPS = [
  { id: "id", label: "Gov ID" },
  { id: "license", label: "License" },
  { id: "review", label: "Review" },
] as const;

export default function NurseOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardStep>("id");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseType, setLicenseType] = useState("RN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDev, setIsDev] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const devBypass = useAction(
    api.actions.credentialVerificationOrchestrator.devBypassVerification
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
    if (member?._id) setMemberId(member._id);
  }, [member]);

  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  async function handleFinalize() {
    setLoading(true);
    setError("");
    try {
      if (!memberId) {
        setError("Session error — please sign in again.");
        return;
      }

      if (isDev) {
        const result = await devBypass({
          memberId,
          email: session.email,
          selectedRole: "nurse",
        });
        if (result.success) {
          setSessionCookie({ ...session, role: "nurse" });
          setStep("complete");
        }
        return;
      }

      // Production: extend credential verification pipeline here
      setError("Production verification not yet wired — contact admin.");
    } catch (err) {
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
          Nurse / Clinical Staff Verification
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        {step !== "complete" && step !== "rejected" && (
          <div className="flex items-center gap-0 mb-12">
            {STEPS.map((s, idx) => {
              const isActive = s.id === step;
              const isComplete = idx < currentStepIdx;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-0">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-medium transition-all ${
                        isComplete
                          ? "border-[#2DD4BF] bg-[#2DD4BF] text-white"
                          : isActive
                            ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <CheckCircle2 size={14} /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] tracking-[0.1em] uppercase font-light hidden sm:block ${
                        isActive ? "text-[#7C3AED]" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-3 mb-5 sm:mb-0 ${
                        isComplete ? "bg-[#2DD4BF]" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isDev && step !== "complete" && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium">
            DEV MODE
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md">
            <XCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive font-light">{error}</p>
          </div>
        )}

        {/* STEP: Government ID */}
        {step === "id" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                Government ID
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                All clinical staff must have a government-issued ID on file.
                {isDev ? " In dev mode, this step is simulated." : ""}
              </p>
            </div>

            <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
              <ShieldCheck size={18} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {isDev ? "Simulated in dev mode" : "Upload coming soon"}
                </p>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  A government-issued photo ID (driver&apos;s license, passport, or state ID) is required for all clinical staff accounts.
                  {isDev ? " Your ID will be recorded automatically in dev mode." : ""}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => router.push("/onboard")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <Button onClick={() => setStep("license")} size="lg">
                Continue
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Nursing License */}
        {step === "license" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                Nursing License
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Enter your nursing license details. We verify active status with your state board.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs tracking-wide text-muted-foreground font-medium">
                  License Type
                </label>
                <select
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-sm font-light"
                >
                  <option value="RN">RN — Registered Nurse</option>
                  <option value="LPN">LPN — Licensed Practical Nurse</option>
                  <option value="APRN">APRN — Advanced Practice Registered Nurse</option>
                  <option value="CNA">CNA — Certified Nursing Assistant</option>
                  <option value="other">Other Clinical Staff</option>
                </select>
              </div>

              <Input
                label="License Number"
                placeholder="e.g. RN123456"
                value={licenseNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setLicenseNumber(e.target.value.toUpperCase());
                  setError("");
                }}
              />

              <Input
                label="Issuing State (2-letter code)"
                placeholder="e.g. FL"
                value={licenseState}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setLicenseState(e.target.value.toUpperCase().slice(0, 2));
                  setError("");
                }}
                maxLength={2}
              />
            </div>

            <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-md">
              <ClipboardCheck size={16} className="text-[#2DD4BF] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground font-light">
                State board verification will be added in a future update. For now, your license number is recorded and reviewed by admin.
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("id")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <Button
                onClick={() => setStep("review")}
                size="lg"
                disabled={!licenseNumber.trim() && !isDev}
              >
                Continue
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Review */}
        {step === "review" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                Review
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Confirm your details before submitting for admin review.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 border border-border rounded-xl">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-2">Role</p>
                <p className="text-foreground font-light">{licenseType || "Nursing Staff"}</p>
              </div>
              {(licenseNumber || isDev) && (
                <div className="p-5 border border-border rounded-xl">
                  <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-2">License</p>
                  <p className="text-foreground font-light font-mono">
                    {isDev ? "DEV-LICENSE-BYPASS" : `${licenseState} ${licenseNumber}`}
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleFinalize} className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {loading ? "Submitting..." : "Complete Verification"}
            </Button>
          </div>
        )}

        {/* STEP: Complete */}
        {step === "complete" && (
          <div className="text-center py-12 space-y-8">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
            >
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                Verification Submitted
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                Your credentials have been recorded. An admin will review and activate your account shortly.
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard")} size="lg">
              Go to Dashboard
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* STEP: Rejected */}
        {step === "rejected" && (
          <div className="text-center py-12 space-y-8">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-destructive/10">
              <XCircle size={28} className="text-destructive" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                Verification Not Approved
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                {error || "Please contact support for assistance."}
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = `mailto:${SITECONFIG.brand.supportEmail}?subject=Nurse Verification Issue`;
              }}
              variant="outline"
            >
              Contact Support
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
