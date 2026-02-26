"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Bell,
  Shield,
  Globe,
  Users,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

const SETTINGS_SECTIONS = [
  {
    title: "Payment Methods",
    description: "Configure accepted payment methods: insurance, ACH, wire, crypto, Zelle, and credit cards.",
    href: "/admin/settings/payments",
    icon: CreditCard,
    badge: "6 methods",
  },
  {
    title: "Notifications",
    description: "Email, SMS, and push notification preferences for staff and patients.",
    href: "/admin/settings/notifications",
    icon: Bell,
    badge: "Coming soon",
    disabled: true,
  },
  {
    title: "Security & Compliance",
    description: "HIPAA settings, audit log retention, session policies, and 2FA enforcement.",
    href: "/admin/settings/security",
    icon: Shield,
    badge: "Coming soon",
    disabled: true,
  },
  {
    title: "Branding & Domain",
    description: "Custom domain, logo, colors, and white-label configuration.",
    href: "/admin/settings/branding",
    icon: Globe,
    badge: "Coming soon",
    disabled: true,
  },
  {
    title: "Team & Roles",
    description: "Manage staff accounts, role permissions, and access levels.",
    href: "/admin/settings/team",
    icon: Users,
    badge: "Coming soon",
    disabled: true,
  },
] as const;

export default function AdminSettingsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">ADMINISTRATION</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Settings
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-10 ml-8">
          Platform configuration and preferences.
        </p>

        {/* Settings Grid */}
        <div className="space-y-3">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isDisabled = "disabled" in section && section.disabled;

            const content = (
              <div
                className={`glass-card group flex items-center gap-5 transition-all ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md cursor-pointer"
                }`}
                style={{ padding: "20px 24px" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124, 58, 237, 0.08)" }}
                >
                  <Icon size={20} style={{ color: "#7C3AED" }} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-[15px] font-medium text-foreground">
                      {section.title}
                    </h3>
                    <span
                      className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full ${
                        isDisabled
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {section.badge}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                {!isDisabled && (
                  <ChevronRight
                    size={18}
                    className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                  />
                )}
              </div>
            );

            if (isDisabled) {
              return <div key={section.title}>{content}</div>;
            }

            return (
              <Link key={section.title} href={section.href} className="block">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
