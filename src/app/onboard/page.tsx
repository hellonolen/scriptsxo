"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, UserCheck, Package, HeartPulse, ArrowRight } from "lucide-react";
import { getSessionCookie } from "@/lib/auth";
import { SITECONFIG, term } from "@/lib/config";

const ROLES = [
  {
    id: "patient" as const,
    label: term("title"),
    description: `I need telehealth consultations and prescriptions. You will verify your identity with a government-issued ID.`,
    icon: UserCheck,
  },
  {
    id: "provider" as const,
    label: "Healthcare Provider",
    description:
      "I am a licensed physician, NP, PA, or APRN. You will verify your NPI number and medical license.",
    icon: Stethoscope,
  },
  {
    id: "nurse" as const,
    label: "Nurse / Clinical Staff",
    description:
      "I am a licensed RN, LPN, or clinical staff member. You will provide your government-issued ID and nursing license.",
    icon: HeartPulse,
  },
  {
    id: "pharmacy" as const,
    label: "Pharmacy",
    description:
      "I represent a pharmacy for prescription fulfillment. You will verify your NCPDP or pharmacy NPI.",
    icon: Package,
  },
] as const;

export default function OnboardPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const session = getSessionCookie();
    if (!session) {
      router.push("/");
      return;
    }
    setUserName(session.name || session.email.split("@")[0]);
  }, [router]);

  function handleContinue() {
    if (!selected) return;
    router.push(`/onboard/${selected}`);
  }

  return (
    <main className="min-h-screen flex">
      {/* Left panel — same editorial style as login */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#1E1037]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.12) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
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
              className="text-4xl xl:text-5xl text-white/85 font-light leading-[1.08] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Welcome,
              <br />
              <em className="gradient-text-soft">{userName}</em>
            </h1>
            <p className="text-white/50 text-base font-light leading-relaxed mt-10 max-w-sm">
              Select your access type to begin the credential verification process.
              Your credentials will be verified before access is granted.
            </p>
          </div>

          <div className="flex items-center gap-8 text-[10px] tracking-[0.25em] text-white/35 uppercase font-light">
            <span>HIPAA Secure</span>
            <span className="w-5 h-px bg-white/10" />
            <span>Credential Verified</span>
            <span className="w-5 h-px bg-white/10" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right panel — role selection */}
      <div className="flex-1 flex items-center justify-center px-8 sm:px-16 py-16 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            <span className="text-[13px] tracking-[0.35em] text-foreground font-light uppercase">
              {SITECONFIG.brand.name}
            </span>
          </div>

          <div className="mb-10">
            <h2
              className="text-3xl font-light text-foreground tracking-[-0.02em] mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Complete Your Access Setup
            </h2>
            <p className="text-muted-foreground font-light text-sm">
              Access is granted after your credentials are verified.
            </p>
          </div>

          <div className="space-y-4">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selected === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelected(role.id)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${isSelected
                      ? "border-[#7C3AED] bg-[#7C3AED]/5"
                      : "border-border hover:border-border/80 hover:bg-muted/50"
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected
                          ? "bg-[#7C3AED]/10"
                          : "bg-muted"
                        }`}
                    >
                      <Icon
                        size={18}
                        className={
                          isSelected ? "text-[#7C3AED]" : "text-muted-foreground"
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium mb-1 ${isSelected ? "text-foreground" : "text-foreground"
                          }`}
                      >
                        {role.label}
                      </p>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`w-full mt-8 inline-flex items-center justify-center gap-2 px-8 py-3.5 text-[11px] tracking-[0.15em] uppercase font-light rounded-lg transition-all duration-300 ${selected
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
          >
            Continue
            <ArrowRight size={14} aria-hidden="true" />
          </button>

          <p className="text-center text-[10px] text-muted-foreground mt-8 font-light">
            Verification typically completes within minutes.
          </p>
        </div>
      </div>
    </main>
  );
}
