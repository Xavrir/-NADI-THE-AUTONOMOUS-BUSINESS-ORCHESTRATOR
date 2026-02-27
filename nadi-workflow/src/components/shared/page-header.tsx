import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, filters }: PageHeaderProps) {
  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-widest text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {filters && <div className="flex items-center gap-2">{filters}</div>}
    </div>
  );
}
