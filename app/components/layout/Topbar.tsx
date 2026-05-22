import type { ReactNode } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-cream/5 bg-dark-base/80 px-6 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="text-sm font-semibold text-cream truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-cream/40 truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 ml-4">{actions}</div>
      )}
    </header>
  );
}
