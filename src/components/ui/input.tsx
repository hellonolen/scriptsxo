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
      "w-full px-4 py-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-base";

    const errorStyles = error
      ? "border-destructive focus:ring-destructive focus:border-destructive"
      : "";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs tracking-wider text-muted-foreground mb-2 uppercase"
          >
            {label}
            {props.required && (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground mb-2">
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
          <p id={errorId} className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
