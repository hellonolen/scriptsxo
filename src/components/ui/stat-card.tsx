import * as React from "react";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Optional sub-label rendered below the value */
  hint?: string;
}

/**
 * Canonical stat card using glass-card base with stat-value / stat-label CSS classes.
 * Replaces the ad-hoc stats-card / stats-card-value / stats-card-label pattern.
 */
export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <div className="glass-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {Icon && (
          <Icon size={16} className="text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <span className="stat-value">{value}</span>
      {hint && (
        <p className="text-xs text-muted-foreground font-light -mt-1">{hint}</p>
      )}
    </div>
  );
}
