import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "info";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium tracking-wide";

    const variants = {
      default: "bg-primary/10 text-primary",
      secondary: "bg-secondary text-secondary-foreground border border-border",
      success: "bg-green-500/15 text-green-600",
      warning: "bg-yellow-500/15 text-yellow-600",
      error: "bg-red-500/15 text-red-600",
      info: "bg-blue-500/15 text-blue-600",
    };

    return (
      <span
        className={`${baseStyles} ${variants[variant]} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
