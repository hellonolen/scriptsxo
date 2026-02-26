"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional forward CTA */
  cta?: {
    label: string;
    href: string;
  };
}

/**
 * Standard empty state used across all data tables, lists, and queues.
 * Includes an optional forward CTA so users always have a next action.
 */
export function EmptyState({ icon: Icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="glass-card text-center py-16 px-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "var(--brand-muted)" }}
      >
        <Icon size={24} style={{ color: "var(--primary)" }} aria-hidden="true" />
      </div>
      <h3
        className="text-lg font-light text-foreground mb-2"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mx-auto font-light leading-relaxed">
          {description}
        </p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-white text-[11px] tracking-[0.15em] uppercase font-medium rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-gradient)" }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
