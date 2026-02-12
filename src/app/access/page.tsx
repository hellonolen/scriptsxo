"use client";

import { useState } from "react";
import Link from "next/link";
import { Fingerprint, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITECONFIG } from "@/lib/config";

type AuthMode = "signin" | "register";

export default function AccessPage() {
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
      setError("Convex backend not connected yet. Passkey auth will work once deployed.");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#2C1810] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 40%, rgba(201, 169, 110, 0.3) 0%, transparent 60%),
                               radial-gradient(circle at 70% 80%, rgba(201, 169, 110, 0.15) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div>
            <Link href="/access" className="text-[#C9A96E] text-2xl tracking-[0.2em] font-light">
              {SITECONFIG.brand.name}
            </Link>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl text-white/90 font-light leading-tight mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Your prescriptions,{" "}
              <span className="text-[#C9A96E] italic">effortlessly</span> managed.
            </h1>
            <p className="text-white/50 text-lg font-light leading-relaxed">
              A private concierge experience for telehealth consultations
              and prescription fulfillment.
            </p>
          </div>
          <div className="flex items-center gap-8 text-[10px] tracking-[0.25em] text-white/30 uppercase">
            <span>HIPAA Secure</span>
            <span className="w-px h-3 bg-white/20" />
            <span>Board Certified</span>
            <span className="w-px h-3 bg-white/20" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-16 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-12">
            <Link href="/access" className="text-foreground text-xl tracking-[0.2em] font-light">
              {SITECONFIG.brand.name}
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground font-light">
              {mode === "signin"
                ? "Sign in with your passkey to continue."
                : "Register to begin your consultation."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="text-sm text-destructive bg-destructive/5 rounded-sm p-3 border border-destructive/10">
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
                  <Fingerprint size={18} aria-hidden="true" />
                  {mode === "signin"
                    ? "Sign In with Passkey"
                    : "Register with Passkey"}
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
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

          <div className="mt-12 flex items-center justify-center gap-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} aria-hidden="true" />
              HIPAA
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint size={12} aria-hidden="true" />
              Passwordless
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
