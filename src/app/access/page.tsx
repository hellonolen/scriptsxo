"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITECONFIG } from "@/lib/config";
import { createSession, setSessionCookie, isAdminEmail, createAdminSession, setAdminCookie } from "@/lib/auth";

type AuthMode = "signin" | "register";

export default function AccessPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Create session and set cookie (passkey flow will replace this)
      const session = createSession(email, name || undefined);
      setSessionCookie(session);

      // Auto-grant admin if email is in the whitelist
      if (isAdminEmail(email)) {
        setAdminCookie(createAdminSession(email));
      }

      router.push("/portal");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Left — Editorial Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#1E1037]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.12) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(225, 29, 72, 0.06) 0%, transparent 70%)`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-16 xl:p-24 w-full">
          <Link
            href="/"
            className="text-[13px] tracking-[0.35em] font-light uppercase"
            style={{ color: "rgba(167, 139, 250, 0.7)" }}
          >
            {SITECONFIG.brand.name}
          </Link>

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
            <Link
              href="/"
              className="text-[13px] tracking-[0.35em] text-foreground font-light uppercase"
            >
              {SITECONFIG.brand.name}
            </Link>
          </div>

          <div className="mb-12">
            <h2
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground font-light">
              {mode === "signin"
                ? "Sign in with your passkey to continue."
                : "Register to begin your consultation."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "register" && (
              <Input
                label="Full Name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {error && (
              <div className="text-sm text-destructive/70 font-light bg-destructive/5 p-4">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <Fingerprint size={16} aria-hidden="true" />
                  {mode === "signin"
                    ? "Sign In with Passkey"
                    : "Register with Passkey"}
                </>
              )}
            </Button>
          </form>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "register" : "signin");
                setError(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="mt-20 flex items-center gap-8 text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-light">
            <div className="flex items-center gap-2">
              <ShieldCheck size={11} aria-hidden="true" />
              HIPAA
            </div>
            <div className="flex items-center gap-2">
              <Fingerprint size={11} aria-hidden="true" />
              Passwordless
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
