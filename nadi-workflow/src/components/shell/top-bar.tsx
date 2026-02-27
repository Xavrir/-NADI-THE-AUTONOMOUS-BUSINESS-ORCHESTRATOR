"use client";

import { Bell, Search, HelpCircle } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-5 backdrop-blur-md">
      {/* Left: page context */}
      <div className="flex items-center gap-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
          NADI Workflow
        </h2>
      </div>

      {/* Center: search (decorative) */}
      <div className="hidden md:flex items-center rounded-none border border-[var(--border)] bg-[var(--background)] px-3 py-2 w-72 transition-all focus-within:border-[var(--primary)] focus-within:shadow-[2px_2px_0px_0px_var(--primary)]">
        <Search className="h-4 w-4 text-[var(--text-muted)] stroke-[2.5]" />
        <input
          className="ml-3 w-full border-none bg-transparent font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] placeholder:text-[var(--border)] focus:outline-none focus:ring-0"
          placeholder="SEARCH WORKFLOWS..."
          readOnly
        />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition-all hover:border-[var(--primary)] hover:bg-[var(--surface)] hover:text-[var(--primary)] hover:shadow-[2px_2px_0px_0px_var(--background)] hover:translate-x-[-1px] hover:translate-y-[-1px]">
          <Bell className="h-4 w-4 stroke-[2.5]" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-none border-[1.5px] border-[#000] bg-[var(--primary)]" />
        </button>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition-all hover:border-[var(--primary)] hover:bg-[var(--surface)] hover:text-[var(--primary)] hover:shadow-[2px_2px_0px_0px_var(--background)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
        >
          <HelpCircle className="h-4 w-4 stroke-[2.5]" />
        </Link>
        <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--border)] bg-[#000] font-mono text-[11px] font-bold text-[var(--primary)] shadow-[2px_2px_0px_0px_var(--background)]">
          KN
        </div>
      </div>
    </header>
  );
}
