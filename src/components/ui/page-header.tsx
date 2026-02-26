import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  /** Renders a back-arrow link beside the title */
  backHref?: string;
  /** Adds pb-6 border-b — use on dashboard-level pages */
  border?: boolean;
  /** Right-side slot (CTA, status badge, etc.) — only rendered when backHref is absent */
  cta?: React.ReactNode;
  /** "lg" = text-3xl lg:text-5xl (dashboard pages), "md" = text-2xl lg:text-4xl (sub-pages) */
  size?: "md" | "lg";
}

/**
 * Unified page header for all internal portal pages.
 *
 * Two layouts:
 * - Without backHref: eyebrow → h1 → description inline, optional CTA on right, optional border
 * - With backHref:    ← arrow + eyebrow → h1, description below with left-indent
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  border = false,
  cta,
  size = "md",
}: PageHeaderProps) {
  const headingClass =
    size === "lg"
      ? "text-3xl lg:text-5xl text-foreground font-light tracking-[-0.03em]"
      : "text-2xl lg:text-4xl text-foreground font-light tracking-[-0.02em]";

  if (backHref) {
    return (
      <>
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            {eyebrow && <p className="eyebrow mb-0.5">{eyebrow}</p>}
            <h1
              className={headingClass}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </h1>
          </div>
        </div>
        {description && (
          <p className="text-muted-foreground font-light mb-8 ml-8">
            {description}
          </p>
        )}
      </>
    );
  }

  return (
    <div
      className={`mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4${
        border ? " pb-6 border-b border-border" : ""
      }`}
    >
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1
          className={headingClass}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground font-light mt-1">{description}</p>
        )}
      </div>
      {cta && <div className="mt-4 sm:mt-0 shrink-0">{cta}</div>}
    </div>
  );
}
