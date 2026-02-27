"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  success: {
    icon: CheckCircle2,
    className: "border-[var(--success-muted)] bg-[var(--success-muted)]/20 text-[var(--success)]",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-[var(--warning-muted)] bg-[var(--warning-muted)]/20 text-[var(--warning)]",
  },
  danger: {
    icon: XCircle,
    className: "border-[var(--danger-muted)] bg-[var(--danger-muted)]/20 text-[var(--danger)]",
  },
  info: {
    icon: Info,
    className: "border-[var(--info-muted)] bg-[var(--info-muted)]/20 text-[var(--info)]",
  },
  neutral: {
    icon: Circle,
    className: "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
  },
} as const;

type StatusVariant = keyof typeof variants;

interface StatusChipProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

export function StatusChip({ variant, label, className }: StatusChipProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
