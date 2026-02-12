"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { SITECONFIG } from "@/lib/config";

const FOOTER_SECTIONS = [
  {
    title: "Patients",
    links: [
      { href: "/portal", label: "Patient Portal" },
      { href: "/portal/prescriptions", label: "My Prescriptions" },
      { href: "/portal/appointments", label: "Appointments" },
      { href: "/portal/messages", label: "Messages" },
    ],
  },
  {
    title: "Providers",
    links: [
      { href: "/provider", label: "Provider Dashboard" },
      { href: "/provider/patients", label: "My Patients" },
      { href: "/provider/prescriptions", label: "Prescriptions" },
      { href: "/provider/consultation", label: "Consultation Room" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/pharmacy", label: "Pharmacy Portal" },
      { href: "/admin", label: "Admin Dashboard" },
      { href: "/admin/compliance", label: "Compliance" },
      { href: "/admin/agents", label: "AI Agents" },
    ],
  },
];

const TRUST_BADGES = [
  "HIPAA COMPLIANT",
  "BOARD CERTIFIED",
  "ENCRYPTED",
  "LICENSED IN FL",
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-muted border-t border-border"
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 md:py-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 mb-4"
              aria-label={`${SITECONFIG.brand.name} home`}
            >
              <Stethoscope
                size={20}
                className="text-primary"
                aria-hidden="true"
              />
              <span className="text-lg font-medium tracking-wide text-foreground">
                {SITECONFIG.brand.name}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              {SITECONFIG.brand.mission}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              {SITECONFIG.brand.supportEmail}
            </p>
          </div>

          {/* Link Sections */}
          {FOOTER_SECTIONS.map((section, i) => (
            <nav key={i} aria-labelledby={`footer-section-${i}`}>
              <h3
                id={`footer-section-${i}`}
                className="text-xs tracking-[0.2em] text-muted-foreground mb-6 uppercase"
              >
                {section.title}
              </h3>
              <ul className="space-y-3" role="list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="border-t border-border py-6 sm:py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-[10px] sm:text-xs tracking-wider text-muted-foreground">
          {TRUST_BADGES.map((badge, i) => (
            <span key={i}>{badge}</span>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border py-4 sm:py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
          <span>
            &copy; {currentYear} {SITECONFIG.brand.name}. All rights reserved.
          </span>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {SITECONFIG.navigation.footer.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
