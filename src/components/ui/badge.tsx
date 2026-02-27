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
      success: "bg-primary/10 text-primary",
      warning: "bg-warning/10 text-warning",
      error: "bg-destructive/10 text-destructive",
      info: "bg-brand/10 text-brand",
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
