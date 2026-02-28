"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceChipProps {
  evidenceId: string;
  variant?: "chip" | "stamp";
  className?: string;
}

export function EvidenceChip({ evidenceId, variant = "chip", className }: EvidenceChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await navigator.clipboard.writeText(evidenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [evidenceId]);

  if (variant === "stamp") {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center gap-1 rounded border-2 border-dashed border-[var(--primary-muted)] px-4 py-2",
          className
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Evidence
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="evidence-id cursor-pointer transition-opacity hover:opacity-80"
        >
          {copied ? "Copied!" : evidenceId}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "evidence-id inline-flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80",
        className
      )}
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied!" : evidenceId}
    </button>
  );
}
