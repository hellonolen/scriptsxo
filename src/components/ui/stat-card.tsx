import * as React from "react";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

/**
 * Canonical stat card using glass-card base with stat-value / stat-label CSS classes.
 * Replaces the ad-hoc stats-card / stats-card-value / stats-card-label pattern.
 */
export function StatCard({ label, value, icon: Icon, hint, trend }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-primary" aria-hidden="true" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
        {hint && (
          <p className={`text-xs mt-1 ${trend === "up" ? "text-success" : trend === "down" ? "text-warning" : "text-muted-foreground"}`}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
