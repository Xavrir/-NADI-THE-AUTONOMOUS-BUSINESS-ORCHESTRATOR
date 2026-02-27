"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/20 bg-emerald-500/10 text-[var(--success)]",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/20 bg-amber-500/10 text-[var(--warning)]",
  },
  danger: {
    icon: XCircle,
    className: "border-red-500/20 bg-red-500/10 text-[var(--danger)]",
  },
  info: {
    icon: Info,
    className: "border-blue-500/20 bg-blue-500/10 text-[var(--info)]",
  },
  neutral: {
    icon: Circle,
    className: "border-white/10 bg-white/5 text-[var(--text-muted)]",
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
