"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const BRAND_NAME = "SCRIPTSXO";
const SESSION_KEY = "scriptsxo_session";
const CTA_LABEL = "GET STARTED";
const CTA_HREF = "/pricing";
const QUOTE_TEXT = '"Telehealth prescriptions, simplified."';

const NAV_LINKS = [
  { label: "ABOUT", href: "/about" },
  { label: "PRICING", href: "/pricing" },
];

const ADMIN_EMAILS = [
  "hellonolen@gmail.com",
  "nolen@doclish.com",
  "nolen@scriptsxo.com",
];

export default function LoginPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "sent" | "code">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = useMutation(api.auth.sendMagicLink);
  const sendBackupCode = useMutation(api.auth.sendBackupCode);
  const verifyBackupCode = useMutation(api.auth.verifyBackupCode);

  // Check if already logged in
  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.expiresAt > Date.now()) {
          router.push("/dashboard");
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, [router]);

  const handleSendMagicLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!firstName.trim() || !email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendMagicLink({
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
      });

      if (result.success) {
        setStep("sent");
      } else {
        setError(result.error || "Failed to send. Please try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCodeInstead = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendBackupCode({
        email: email.toLowerCase().trim(),
      });

      if (result.success) {
        setStep("code");
      } else {
        setError(result.error || "Failed to send code.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyBackupCode({
        email: email.toLowerCase().trim(),
        code: code.trim(),
      });

      if (result.success) {
        const session = {
          email: result.email,
          name: result.name || firstName,
          role: result.role || "member",
          isAdmin: result.isAdmin || false,
          authenticatedAt: Date.now(),
          expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        if (result.isAdmin) {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(result.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Mini Nav */}
          <div className="flex items-center justify-between mb-16">
            <Link href="/" className="text-lg font-light tracking-wider text-white">
              {BRAND_NAME}
            </Link>
            <nav className="flex items-center gap-6">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs tracking-wider text-white/40 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={CTA_HREF}
                className="px-4 py-1.5 text-xs tracking-wider font-medium bg-white text-black rounded-[5px] hover:bg-white/90 transition-colors"
              >
                {CTA_LABEL}
              </Link>
            </nav>
          </div>

          {/* Step 1: First Name + Email */}
          {step === "form" && (
            <>
              <p className="text-xs tracking-[0.3em] text-white/40 mb-4 uppercase">Sign In</p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4">
                Welcome.
              </h1>
              <p className="text-white/40 font-light mb-8">
                Enter your name and email. We'll send you a sign-in link.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendMagicLink} className="space-y-6">
                <div>
                  <label className="block text-xs tracking-wider text-white/40 mb-3 uppercase">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                    className="w-full px-0 py-4 bg-transparent border-0 border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors text-lg font-light"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-white/40 mb-3 uppercase">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-0 py-4 bg-transparent border-0 border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors text-lg font-light"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !firstName.trim() || !email.trim()}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-black text-sm tracking-wider font-medium hover:bg-white/90 transition-colors disabled:opacity-50 rounded-[5px]"
                >
                  <Mail size={20} />
                  {isLoading ? "SENDING..." : "SEND SIGN-IN LINK"}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Magic Link Sent */}
          {step === "sent" && (
            <>
              <button
                onClick={() => { setStep("form"); setError(null); }}
                className="text-white/40 hover:text-white text-sm mb-8"
              >
                &larr; Back
              </button>

              <p className="text-xs tracking-[0.3em] text-white/40 mb-4 uppercase">Check Your Email</p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4">
                Link sent.
              </h1>
              <p className="text-white/40 font-light mb-2">
                We sent a sign-in link to <span className="text-white">{email}</span>
              </p>
              <p className="text-white/30 font-light text-sm mb-8">
                Click the link in your email to sign in. Check your spam folder if you don't see it.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={() => handleSendMagicLink()}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 border border-white/20 text-sm tracking-wider hover:bg-white/10 transition-colors rounded-[5px]"
                >
                  {isLoading ? "RESENDING..." : "RESEND LINK"}
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30 tracking-wider">OR</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  onClick={handleUseCodeInstead}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 border border-white/10 text-sm tracking-wider text-white/60 hover:bg-white/5 hover:text-white transition-colors rounded-[5px]"
                >
                  {isLoading ? "SENDING CODE..." : "USE 8-DIGIT CODE INSTEAD"}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Backup — 8-digit code */}
          {step === "code" && (
            <>
              <button
                onClick={() => { setStep("sent"); setCode(""); setError(null); }}
                className="text-white/40 hover:text-white text-sm mb-8"
              >
                &larr; Back
              </button>

              <p className="text-xs tracking-[0.3em] text-white/40 mb-4 uppercase">Backup Code</p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4">
                Enter your code.
              </h1>
              <p className="text-white/40 font-light mb-2">
                We sent an 8-digit code to <span className="text-white">{email}</span>
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm mt-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-6 mt-8">
                <div>
                  <label className="block text-xs tracking-wider text-white/40 mb-3 uppercase">
                    8-Digit Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="00000000"
                    className="w-full px-0 py-4 bg-transparent border-0 border-b border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors text-3xl font-light tracking-[0.4em] text-center"
                    required
                    autoFocus
                    inputMode="numeric"
                    maxLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || code.length !== 8}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-black text-sm tracking-wider font-medium hover:bg-white/90 transition-colors disabled:opacity-50 rounded-[5px]"
                >
                  <ArrowRight size={20} />
                  {isLoading ? "VERIFYING..." : "SIGN IN"}
                </button>
              </form>

              <button
                onClick={handleUseCodeInstead}
                disabled={isLoading}
                className="mt-6 w-full text-center text-sm text-white/40 hover:text-white transition-colors"
              >
                Didn't get the code? Send again
              </button>
            </>
          )}

          <p className="text-sm text-white/30 mt-12">
            New here?{" "}
            <Link href="/pricing" className="text-white hover:underline underline-offset-4">
              Get started
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#2DD4BF]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-2xl font-extralight leading-relaxed">
            {QUOTE_TEXT}
          </p>
        </div>
      </div>
    </main>
  );
}
