import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "~/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-cream/80"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-lg border bg-navy/40 px-3 text-sm text-cream",
            "placeholder:text-cream/25 outline-none transition-colors",
            "border-cream/10 focus:border-amber/50 focus:ring-1 focus:ring-amber/20",
            error && "border-terracotta/60 focus:border-terracotta focus:ring-terracotta/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-terracotta">{error}</p>}
        {hint && !error && <p className="text-xs text-cream/35">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
