import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavCardProps {
  title: string;
  description?: string;
  href: string;
  icon?: LucideIcon;
  /** Short label shown bottom-left (e.g. "View All", "View Reports") */
  stat?: string;
  /** Override the bottom-left slot entirely */
  rightSlot?: React.ReactNode;
}

/**
 * Navigation card using the flat bg-card border style with hover accent.
 * Used in admin and provider dashboards to link to sub-sections.
 */
export function NavCard({
  title,
  description,
  href,
  icon: Icon,
  stat,
  rightSlot,
}: NavCardProps) {
  return (
    <Link
      href={href}
      className="group block p-6 bg-card border border-border rounded-lg hover:border-brand-secondary/40 transition-all duration-300"
    >
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-brand-secondary-muted flex items-center justify-center mb-4">
          <Icon size={18} className="text-foreground" aria-hidden="true" />
        </div>
      )}
      <h3
        className="text-base text-foreground font-light mb-1.5"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground font-light mb-4 leading-relaxed">
          {description}
        </p>
      )}
      <div className="flex items-center justify-between">
        {rightSlot ?? (
          <span className="text-xs tracking-[0.1em] text-brand-secondary uppercase font-light">
            {stat}
          </span>
        )}
        <ArrowRight
          size={14}
          className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
