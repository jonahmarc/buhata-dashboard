import { cn } from "~/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-cream/8 text-cream/60",
  success: "bg-emerald-500/12 text-emerald-400",
  warning: "bg-amber/12 text-amber",
  danger: "bg-terracotta/12 text-terracotta",
  info: "bg-blue-500/12 text-blue-400",
};

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
