import * as React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = "", variant = "rectangular", ...props }, ref) => {
    const baseStyles = "animate-shimmer";

    const variants = {
      text: "h-4 w-full rounded",
      circular: "rounded-full",
      rectangular: "rounded-md",
    };

    return (
      <div
        className={`${baseStyles} ${variants[variant]} ${className}`}
        ref={ref}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
