import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className = "", label, error, description, type = "text", id, ...props },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const descriptionId = description ? `${inputId}-description` : undefined;

    const baseStyles =
      "w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light";

    const errorStyles = error
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs tracking-wide text-muted-foreground mb-2 font-medium"
          >
            {label}
            {props.required && (
              <span className="text-destructive/50 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {description && (
          <p
            id={descriptionId}
            className="text-xs text-muted-foreground mb-2 font-light"
          >
            {description}
          </p>
        )}
        <input
          type={type}
          id={inputId}
          className={`${baseStyles} ${errorStyles} ${className}`}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [errorId, descriptionId].filter(Boolean).join(" ") || undefined
          }
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-destructive/70 font-light"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
