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
  FileSearch,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionCookie, setSessionCookie } from "@/lib/auth";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SITECONFIG } from "@/lib/config";

type OnboardStep = "npi" | "license" | "dea" | "review" | "complete" | "rejected";

const STEPS = [
  { id: "npi", label: "NPI Lookup" },
  { id: "license", label: "License" },
  { id: "dea", label: "DEA" },
  { id: "review", label: "Review" },
] as const;

export default function ProviderOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardStep>("npi");
  const [npiNumber, setNpiNumber] = useState("");
  const [deaNumber, setDeaNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [npiResult, setNpiResult] = useState<any>(null);
  const [isDev, setIsDev] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  // Convex actions
  const initVerification = useAction(
    api.actions.credentialVerificationOrchestrator.initializeVerification
  );
  const verifyNpi = useAction(
    api.agents.credentialVerificationAgent.verifyProviderNpi
  );
  const processLicense = useAction(
    api.agents.credentialVerificationAgent.processProviderLicense
  );
  const processDea = useAction(
    api.agents.credentialVerificationAgent.processProviderDea
  );
  const finalizeVerification = useAction(
    api.actions.credentialVerificationOrchestrator.finalizeVerification
  );
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

  // Get member record for memberId
  const member = useQuery(
    api.members.getByEmail,
    session?.email ? { email: session.email } : "skip"
  );

  useEffect(() => {
    if (member?._id) {
      setMemberId(member._id);
    }
  }, [member]);

  /** Initialize verification on first NPI submit */
  async function handleNpiSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!npiNumber.trim() || npiNumber.replace(/\D/g, "").length !== 10) {
      setError("Please enter a valid 10-digit NPI number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Dev mode: simulate NPI lookup
      if (isDev) {
        const fakeNpi = {
          verified: true,
          npiNumber: npiNumber,
          firstName: session?.name?.split(" ")[0] || "Provider",
          lastName: session?.name?.split(" ")[1] || "User",
          credential: "MD",
          taxonomy: "207Q00000X",
          taxonomyDescription: "Family Medicine",
          state: "FL",
          status: "A",
          organizationName: null,
          address: "123 Medical Way, Tampa, FL 33601",
          phone: "813-555-0199",
          issues: [],
        };
        setNpiResult(fakeNpi);
        setStep("license");
        setLoading(false);
        return;
      }

      // Initialize the verification record if not done yet
      if (!verificationId && memberId) {
        const result = await initVerification({
          memberId,
          email: session.email,
          selectedRole: "provider",
        });
        setVerificationId(result.verificationId);

        // Run NPI verification
        const npiRes = await verifyNpi({
          verificationId: result.verificationId,
          npiNumber: npiNumber.replace(/\D/g, ""),
          expectedFirstName: session?.name?.split(" ")[0],
          expectedLastName: session?.name?.split(" ").slice(1).join(" "),
        });

        setNpiResult(npiRes.npiResult);

        if (npiRes.verified) {
          setStep("license");
        } else {
          setError(
            `NPI verification failed: ${npiRes.npiResult.issues?.join("; ") || "Unknown error"}`
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "NPI verification failed");
    } finally {
      setLoading(false);
    }
  }

  /** Skip license upload for now (can be required later) */
  async function handleLicenseContinue() {
    setLoading(true);
    try {
      if (!isDev && verificationId) {
        // In production, advance past license step
        // (In a full implementation, this would include file upload + OCR)
        await processLicense({
          verificationId,
          licenseScanResult: {
            name: `${npiResult?.firstName} ${npiResult?.lastName}`,
            state: npiResult?.state || "FL",
            verified: true,
            note: "License verification pending document upload",
          },
          npiFirstName: npiResult?.firstName,
          npiLastName: npiResult?.lastName,
        });
      }
      setStep("dea");
    } catch (err) {
      setError(err instanceof Error ? err.message : "License step failed");
    } finally {
      setLoading(false);
    }
  }

  /** Handle DEA entry (optional) */
  async function handleDeaSubmit(skip = false) {
    setLoading(true);
    setError("");

    try {
      if (!isDev && verificationId) {
        await processDea({
          verificationId,
          deaNumber: skip ? undefined : deaNumber || undefined,
          skipDea: skip,
        });
      }
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "DEA step failed");
    } finally {
      setLoading(false);
    }
  }

  /** Finalize and assign role */
  async function handleFinalize() {
    setLoading(true);
    setError("");

    try {
      if (isDev && memberId) {
        // Dev bypass
        const result = await devBypass({
          memberId,
          email: session.email,
          selectedRole: "provider",
        });

        if (result.success) {
          // Update the session cookie with the new role
          const updatedSession = {
            ...session,
            role: "provider",
          };
          setSessionCookie(updatedSession);
          setStep("complete");
        }
        return;
      }

      if (!verificationId || !memberId) {
        setError("Missing verification data");
        return;
      }

      const result = await finalizeVerification({
        verificationId,
        memberId,
      });

      if (result.success) {
        // Update the session cookie with the verified role
        const updatedSession = {
          ...session,
          role: result.role,
        };
        setSessionCookie(updatedSession);
        setStep("complete");
      } else {
        setStep("rejected");
        setError("Credential verification was not approved. Please contact support.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  function handleGoToDashboard() {
    router.push("/provider");
  }

  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center px-6 bg-background">
        <span className="text-[11px] tracking-[0.25em] text-foreground font-light uppercase">
          {SITECONFIG.brand.name}
        </span>
        <span className="mx-4 text-border">|</span>
        <span className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase font-light">
          Provider Verification
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress steps */}
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
                      {isComplete ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        idx + 1
                      )}
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

        {/* STEP: NPI Entry */}
        {step === "npi" && (
          <div className="space-y-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                NPI Verification
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Enter your National Provider Identifier. We will verify it against the NPPES registry in real time.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md">
                <XCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive font-light">{error}</p>
              </div>
            )}

            <form onSubmit={handleNpiSubmit} className="space-y-6">
              <Input
                label="NPI Number"
                placeholder="1234567890"
                value={npiNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setNpiNumber(val);
                  setError("");
                }}
                maxLength={10}
                required
                autoFocus
              />

              <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-md">
                <FileSearch size={16} className="text-[#2DD4BF] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground font-light">
                  We query the CMS NPPES NPI Registry (npiregistry.cms.hhs.gov) to verify your identity, specialty, prescribing authority, and license status.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading || npiNumber.length !== 10}>
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {loading ? "Verifying NPI..." : "Verify NPI"}
              </Button>
            </form>

            <button
              onClick={() => router.push("/onboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-2"
            >
              <ArrowLeft size={13} />
              Choose a different role
            </button>
          </div>
        )}

        {/* STEP: License Upload */}
        {step === "license" && (
          <div className="space-y-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                License Verification
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Your NPI was verified successfully. Please confirm the details below.
              </p>
            </div>

            {/* NPI result card */}
            {npiResult && (
              <div className="p-6 border border-[#2DD4BF]/30 rounded-xl bg-[#2DD4BF]/5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 size={18} className="text-[#2DD4BF]" />
                  <span className="text-sm font-medium text-foreground">NPI Verified</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-1">Name</p>
                    <p className="text-foreground font-light">
                      {npiResult.firstName} {npiResult.lastName}
                      {npiResult.credential && `, ${npiResult.credential}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-1">NPI</p>
                    <p className="text-foreground font-light font-mono">{npiResult.npiNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-1">Specialty</p>
                    <p className="text-foreground font-light">{npiResult.taxonomyDescription || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-1">State</p>
                    <p className="text-foreground font-light">{npiResult.state || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-md">
              <ClipboardCheck size={16} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground font-light">License document upload</p>
                <p className="text-xs text-muted-foreground font-light mt-1">
                  In a future update, you will be able to upload a photo of your medical license for AI-powered OCR verification. For now, your NPI verification serves as the primary credential check.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("npi")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <Button onClick={handleLicenseContinue} size="lg" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Continue
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: DEA Number (Optional) */}
        {step === "dea" && (
          <div className="space-y-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                DEA Registration
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                If you prescribe controlled substances, enter your DEA number. This is optional and can be added later.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md">
                <XCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive font-light">{error}</p>
              </div>
            )}

            <Input
              label="DEA Number (Optional)"
              placeholder="AB1234567"
              value={deaNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setDeaNumber(e.target.value.toUpperCase().slice(0, 9));
                setError("");
              }}
              maxLength={9}
            />

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("license")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeaSubmit(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
                >
                  Skip for Now
                </button>
                <Button
                  onClick={() => handleDeaSubmit(false)}
                  size="lg"
                  disabled={loading || !deaNumber}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Continue
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Review */}
        {step === "review" && (
          <div className="space-y-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Verification Review
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Our AI compliance agent will review your credentials. This typically takes a few seconds.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md">
                <XCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive font-light">{error}</p>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-4">
              <div className="p-5 border border-border rounded-xl">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-2">Provider</p>
                <p className="text-foreground font-light">
                  {npiResult?.firstName} {npiResult?.lastName}, {npiResult?.credential || "MD"}
                </p>
              </div>
              <div className="p-5 border border-border rounded-xl">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-2">NPI</p>
                <p className="text-foreground font-light font-mono">{npiNumber}</p>
              </div>
              <div className="p-5 border border-border rounded-xl">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-2">Specialty</p>
                <p className="text-foreground font-light">{npiResult?.taxonomyDescription || "N/A"}</p>
              </div>
              {deaNumber && (
                <div className="p-5 border border-border rounded-xl">
                  <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-2">DEA</p>
                  <p className="text-foreground font-light font-mono">{deaNumber}</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleFinalize}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {loading ? "AI Agent Reviewing..." : "Complete Verification"}
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
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Verification Complete
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                Your provider credentials have been verified. You now have full access to the provider portal.
              </p>
            </div>
            <Button onClick={handleGoToDashboard} size="lg">
              Go to Provider Portal
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
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Verification Not Approved
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                {error || "Your credentials could not be verified at this time. Please contact support for assistance."}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setStep("npi");
                  setError("");
                  setNpiNumber("");
                  setVerificationId(null);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-md"
              >
                Try Again
              </button>
              <Button
                onClick={() => {
                  window.location.href = `mailto:${SITECONFIG.brand.supportEmail}?subject=Provider Verification Issue`;
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
