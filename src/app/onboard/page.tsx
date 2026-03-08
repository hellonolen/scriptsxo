"use client";

import { useRouter } from "next/navigation";
import { User, Stethoscope, Building2, ArrowRight } from "lucide-react";
import { SITECONFIG } from "@/lib/config";

const ROLES = [
  {
    id: "patient",
    label: "Client",
    description: "I need a prescription processed through telehealth.",
    icon: User,
    href: "/onboard/patient",
  },
  {
    id: "provider",
    label: "Healthcare Provider",
    description: "I am a provider, NP, PA, or APRN.",
    icon: Stethoscope,
    href: "/onboard/provider",
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    description: "We fulfill prescriptions for ScriptsXO clients.",
    icon: Building2,
    href: "/onboard/pharmacy",
  },
] as const;

export default function OnboardRoleSelectPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Dark hero header */}
      <header
        className="px-8 py-10 flex flex-col gap-6"
        style={{ background: "var(--sidebar-background)" }}
      >
        <div className="max-w-2xl mx-auto w-full">
          {/* Brand wordmark */}
          <span
            className="eyebrow"
            style={{ color: "rgba(167, 139, 250, 0.7)" }}
          >
            {SITECONFIG.brand.name}
          </span>

          <div className="mt-6">
            <h1
              className="text-3xl sm:text-4xl font-light text-white/90 leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.025em" }}
            >
              Get started.{" "}
              <em className="gradient-text-soft not-italic">Choose your role.</em>
            </h1>
            <div
              className="mt-4 h-px w-16"
              style={{ background: "rgba(167, 139, 250, 0.35)" }}
            />
          </div>

          <p className="mt-4 text-sm font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
            Select how you will use {SITECONFIG.brand.name}. Access is granted after credential verification.
          </p>
        </div>
      </header>

      {/* Role cards */}
      <section className="flex-1 bg-background px-8 py-10">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => router.push(role.href)}
                className="glass-card w-full text-left group cursor-pointer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  padding: "1.5rem",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--brand-muted)",
                    transition: "background 0.25s ease",
                  }}
                >
                  <Icon
                    size={22}
                    style={{ color: "var(--brand-secondary)", strokeWidth: 1.5 }}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-foreground"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {role.label}
                  </p>
                  <p className="text-xs font-light text-muted-foreground mt-0.5 leading-relaxed">
                    {role.description}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight
                  size={16}
                  className="flex-shrink-0 text-muted-foreground"
                  style={{
                    transition: "transform 0.2s ease, color 0.2s ease",
                  }}
                />
              </button>
            );
          })}

          <p className="text-center text-[10px] font-light text-muted-foreground pt-4">
            Verification typically completes within minutes.
          </p>
        </div>
      </section>
    </main>
  );
}
