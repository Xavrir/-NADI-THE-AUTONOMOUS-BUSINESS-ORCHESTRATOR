"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-[var(--primary)]">
            NADI
          </span>
          <span className="hidden text-xs font-medium tracking-widest text-[var(--text-muted)] uppercase sm:inline">
            Business Orchestrator
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-[var(--border)] text-[var(--text-muted)]"
        >
          v0.1 — Demo
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
          </Link>
        </Button>
        <Button
          size="sm"
          className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        >
          Run
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card)] text-xs font-medium text-[var(--text-secondary)]">
          KN
        </div>
      </div>
    </header>
  );
}
