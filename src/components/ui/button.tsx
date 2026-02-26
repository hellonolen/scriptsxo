import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "default", size = "default", children, ...props },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-light transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-40 tracking-[0.15em] uppercase";

    const variants = {
      default:
        "bg-primary text-primary-foreground hover:bg-brand-hover",
      secondary:
        "bg-transparent text-foreground border border-border/40 hover:border-foreground/30",
      outline:
        "bg-transparent text-foreground border border-border/30 hover:border-foreground/40",
      ghost:
        "bg-transparent text-muted-foreground hover:text-foreground",
      destructive:
        "bg-destructive/5 text-destructive/80 border border-destructive/10 hover:bg-destructive/10",
    };

    const sizes = {
      default: "h-11 px-7 text-[10px]",
      sm: "h-9 px-5 text-[9px]",
      lg: "h-14 px-10 text-[11px]",
      icon: "h-10 w-10 text-[10px]",
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button className={combinedClassName} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
