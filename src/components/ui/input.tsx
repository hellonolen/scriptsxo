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
      "w-full px-0 py-3 bg-transparent border-0 border-b border-border/40 text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-foreground/40 transition-colors text-base font-light";

    const errorStyles = error
      ? "border-destructive/40 focus:border-destructive/60"
      : "";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[10px] tracking-[0.25em] text-muted-foreground/50 mb-3 uppercase font-light"
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
            className="text-xs text-muted-foreground/40 mb-2 font-light"
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
