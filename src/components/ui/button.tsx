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
      "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 tracking-wider";

    const variants = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 rounded-[5px]",
      secondary:
        "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 rounded-[5px]",
      outline:
        "border border-border bg-transparent text-foreground hover:bg-muted rounded-[5px]",
      ghost:
        "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-[5px]",
      destructive:
        "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-[5px]",
    };

    const sizes = {
      default: "h-10 px-6 py-2",
      sm: "h-8 px-4 py-1 text-xs",
      lg: "h-14 px-8 py-5",
      icon: "h-10 w-10",
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
