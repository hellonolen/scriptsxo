"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  /** Extra content rendered inline with the title row (e.g. action buttons) */
  actions?: React.ReactNode;
}

/**
 * Standard page header used across all portal / admin / provider / pharmacy pages.
 * Keeps eyebrow → title → subtitle + optional back link visually consistent.
 */
export function PageHeader({ eyebrow, title, subtitle, backHref, actions }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="mt-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
          )}
          <div>
            <p className="eyebrow mb-1">{eyebrow}</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-light mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
