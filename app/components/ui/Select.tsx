import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "~/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-cream/80"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-9 w-full rounded-lg border bg-navy/40 px-3 text-sm text-cream",
            "outline-none transition-colors appearance-none cursor-pointer",
            "border-cream/10 focus:border-amber/50 focus:ring-1 focus:ring-amber/20",
            error && "border-terracotta/60",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-terracotta">{error}</p>}
        {hint && !error && <p className="text-xs text-cream/35">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
