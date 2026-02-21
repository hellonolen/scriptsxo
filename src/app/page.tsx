"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITECONFIG } from "@/lib/config";
import {
  createSession,
  setSessionCookie,
  getSessionCookie,
  isAdminEmail,
  createAdminSession,
  setAdminCookie,
} from "@/lib/auth";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  registerPasskey,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "@/lib/webauthn";

type AuthStep =
  | "email"
  | "name"
  | "processing"
  | "routing"
  | "error"
  | "unsupported";

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  // WebAuthn server actions
  const getRegOptions = useAction(
    api.actions.webauthn.getRegistrationOptions
  );
  const verifyReg = useAction(
    api.actions.webauthn.verifyAndStoreRegistration
  );
  const getAuthOptions = useAction(
    api.actions.webauthn.getAuthenticationOptions
  );
  const verifyAuth = useAction(api.actions.webauthn.verifyAuthentication);

  // Patient/membership queries for post-auth routing
  const [routingEmail, setRoutingEmail] = useState<string | null>(null);

  const patient = useQuery(
    api.patients.getByEmail,
    routingEmail ? { email: routingEmail } : "skip"
  );
  const membership = useQuery(
    api.passkeys.getMembershipStatus,
    routingEmail ? { email: routingEmail } : "skip"
  );

  // Check WebAuthn support on mount
  useEffect(() => {
    async function checkSupport() {
      if (!isWebAuthnSupported()) {
        setStep("unsupported");
        return;
      }
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      if (!platformAvailable) {
        setStep("unsupported");
      }
    }
    checkSupport();
  }, []);

  // Route when patient/membership data loads
  useEffect(() => {
    if (step !== "routing" || !routingEmail) return;
    if (patient === undefined || membership === undefined) return;

    // Update session cookie with payment status before routing
    const currentSession = getSessionCookie();
    if (currentSession) {
      const paymentStatus = membership?.isPaid === true ? "active" : "none";
      setSessionCookie({ ...currentSession, paymentStatus });
    }

    const hasPaid = membership?.isPaid === true;
    if (patient && hasPaid) {
      router.push("/dashboard");
    } else if (patient) {
      router.push("/intake/payment");
    } else {
      router.push("/dashboard");
    }
  }, [step, routingEmail, patient, membership, router]);

  function handleAuthError(err: unknown) {
    const rawMessage =
      err instanceof Error ? err.message : "An unexpected error occurred";
    const convexData = (err as Record<string, unknown>)?.data;
    const message = typeof convexData === "string" ? convexData : rawMessage;

    if (
      message.includes("NotAllowed") ||
      message.includes("cancelled") ||
      message.includes("aborted") ||
      message.includes("The operation either timed out")
    ) {
      setError("Authentication was cancelled. Please try again.");
    } else {
      setError(message);
    }
    setStep("error");
  }

  /**
   * Email submit: try authentication first (returning user),
   * fall back to registration form if no passkeys exist.
   */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStep("processing");
    setStatusText("Checking your account...");
    setError("");

    try {
      // Try to authenticate (server throws if no passkeys exist)
      const authOptions = await getAuthOptions({
        email: email.toLowerCase(),
      });

      setStatusText("Verify with your device...");
      const authentication = await authenticatePasskey(authOptions);

      setStatusText("Verifying...");
      const result = await verifyAuth({
        email: email.toLowerCase(),
        response: JSON.stringify(authentication),
      });

      if (!result.success) throw new Error(result.error);

      // Create session cookie
      const session = createSession(email);
      setSessionCookie(session);

      if (isAdminEmail(email)) {
        setAdminCookie(createAdminSession(email));
        router.push("/admin");
        return;
      }

      setRoutingEmail(email.toLowerCase());
      setStep("routing");
      setStatusText("Signing you in...");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const convexData = (err as Record<string, unknown>)?.data;
      const fullMessage = typeof convexData === "string" ? convexData : message;
      // No passkeys → show registration form
      if (
        fullMessage.includes("No passkeys") ||
        fullMessage.includes("no credentials") ||
        fullMessage.includes("No passkeys registered")
      ) {
        setStep("name");
        setError("");
      } else {
        handleAuthError(err);
      }
    }
  }

  /**
   * Registration: create passkey bound to this device.
   */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setStep("processing");
    setStatusText("Setting up your passkey...");
    setError("");

    try {
      const regOptions = await getRegOptions({
        email: email.toLowerCase(),
        userName: name,
      });

      setStatusText("Register with your device...");
      const registration = await registerPasskey(regOptions);

      setStatusText("Securing your account...");
      const result = await verifyReg({
        email: email.toLowerCase(),
        response: JSON.stringify(registration),
      });

      if (!result.success) throw new Error(result.error);

      // Create session cookie
      const session = createSession(email, name);
      setSessionCookie(session);

      if (isAdminEmail(email)) {
        setAdminCookie(createAdminSession(email));
        router.push("/admin");
        return;
      }

      setRoutingEmail(email.toLowerCase());
      setStep("routing");
      setStatusText("Welcome to ScriptsXO...");
    } catch (err: unknown) {
      handleAuthError(err);
    }
  }

  function handleRetry() {
    setStep("email");
    setError("");
    setStatusText("");
  }

  return (
    <main className="min-h-screen flex">
      {/* Left — Editorial Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#1E1037]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.12) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(45, 212, 191, 0.06) 0%, transparent 70%)`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-16 xl:p-24 w-full">
          <span
            className="text-[13px] tracking-[0.35em] font-light uppercase"
            style={{ color: "rgba(167, 139, 250, 0.7)" }}
          >
            {SITECONFIG.brand.name}
          </span>

          <div className="max-w-lg">
            <h1
              className="text-5xl xl:text-[4.25rem] text-white/85 font-light leading-[1.08] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your prescriptions,
              <br />
              <em className="gradient-text-soft">effortlessly</em>
              <br />
              managed.
            </h1>
            <p className="text-white/50 text-base font-light leading-relaxed mt-10 max-w-sm">
              A private concierge experience for telehealth consultations and
              prescription fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-8 text-[10px] tracking-[0.25em] text-white/35 uppercase font-light">
            <span>HIPAA Secure</span>
            <span className="w-5 h-px bg-white/10" />
            <span>Board Certified</span>
            <span className="w-5 h-px bg-white/10" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center px-8 sm:px-16 py-16 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-16">
            <span
              className="text-[13px] tracking-[0.35em] text-foreground font-light uppercase"
            >
              {SITECONFIG.brand.name}
            </span>
          </div>

          {/* STEP: Device not supported */}
          {step === "unsupported" && (
            <div className="space-y-6">
              <div className="mb-12">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Device Not Supported
                </h2>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Your device does not support biometric authentication (Face
                  ID, Touch ID, or Windows Hello). Please use a device with
                  biometric capabilities to sign in.
                </p>
              </div>
            </div>
          )}

          {/* STEP: Processing / Routing spinner */}
          {(step === "processing" || step === "routing") && (
            <div className="text-center py-20">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{
                  borderColor: "#7C3AED",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-sm text-muted-foreground font-light">
                {statusText || "Please wait..."}
              </p>
            </div>
          )}

          {/* STEP: Email entry (initial) */}
          {step === "email" && (
            <>
              <div className="mb-12">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Welcome
                </h2>
                <p className="text-muted-foreground font-light">
                  Enter your email to sign in or create an account.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoComplete="email webauthn"
                />

                <Button type="submit" className="w-full" size="lg">
                  <Fingerprint size={16} aria-hidden="true" />
                  Continue
                </Button>
              </form>

              <div className="mt-20 flex items-center gap-8 text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-light">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={11} aria-hidden="true" />
                  HIPAA
                </div>
                <div className="flex items-center gap-2">
                  <Fingerprint size={11} aria-hidden="true" />
                  Passkey
                </div>
              </div>
            </>
          )}

          {/* STEP: Name entry (new user registration) */}
          {step === "name" && (
            <>
              <div className="mb-12">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Create Account
                </h2>
                <p className="text-muted-foreground font-light">
                  No account found for{" "}
                  <span className="text-foreground font-normal">{email}</span>.
                  Enter your name to register.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <Input
                  label="Full Name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  required
                  autoComplete="name"
                  autoFocus
                />

                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  You will use Face ID, Touch ID, or Windows Hello to securely
                  sign in. Your biometric data never leaves your device.
                </p>

                <Button type="submit" className="w-full" size="lg">
                  <Fingerprint size={16} aria-hidden="true" />
                  Register with Passkey
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
              >
                Use a different email
              </button>
            </>
          )}

          {/* STEP: Error */}
          {step === "error" && (
            <>
              <div className="mb-8">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Something went wrong
                </h2>
              </div>

              <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md mb-6">
                <AlertCircle
                  size={18}
                  className="text-destructive mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-destructive font-light">
                  {error || "An unexpected error occurred. Please try again."}
                </p>
              </div>

              <Button
                onClick={handleRetry}
                className="w-full"
                size="lg"
                variant="outline"
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
