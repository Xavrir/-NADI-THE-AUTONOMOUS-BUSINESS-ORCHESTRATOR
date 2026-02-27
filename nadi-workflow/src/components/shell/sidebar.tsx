"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Inbox,
  GitBranch,
  DollarSign,
  Megaphone,
  Package,
  Headphones,
  Shield,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tag?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/cs-console", label: "CS Console", icon: Headphones, tag: "Read only" },
  { href: "/governance", label: "Governance", icon: Shield },
  { href: "/audit-log", label: "Audit Log", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-[var(--sidebar-border)] px-5 py-4 bg-[var(--background)]">
        <Image
          src="/nadi-logo.jpeg"
          alt="NADI Logo"
          width={36}
          height={36}
          className="h-9 w-9 rounded-sm object-cover shadow-[2px_2px_0px_0px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
        />
        <div className="flex flex-col">
          <span className="font-display text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
            NADI
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--primary)]">
            Orchestrator
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-all border",
                isActive
                  ? "bg-[var(--primary)] text-[#000] border-[var(--primary)] shadow-[3px_3px_0px_0px_color-mix(in_srgb,var(--primary)_30%,transparent)] translate-x-[2px] translate-y-[-2px]"
                  : "text-[var(--text-secondary)] border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] hover:shadow-[2px_2px_0px_0px_var(--background)]"
              )}
            >
              <Icon className={cn("h-[16px] w-[16px] stroke-[2.5] shrink-0", isActive ? "text-[#000]" : "text-[var(--text-muted)] group-hover:text-[var(--primary)]")} />
              <span className="truncate">{item.label}</span>
              {item.tag && (
                <span className={cn(
                  "ml-auto text-[9px] font-mono px-1.5 py-0.5 border rounded-sm",
                  isActive ? "border-[#000]/20 text-[#000]" : "border-[var(--border)] text-[var(--text-muted)]"
                )}>
                  {item.tag}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile block */}
      <div className="border-t border-[var(--sidebar-border)] p-4 bg-[var(--background)] space-y-2">
        <div className="flex items-center gap-3 rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-3 shadow-[2px_2px_0px_0px_var(--background)]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#000] border border-[var(--border)] text-xs font-mono font-bold text-[var(--primary)]">
            {initials}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">{user?.name ?? "Loading..."}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{user?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] transition-all hover:border-[var(--danger)] hover:text-[var(--danger)] hover:shadow-[2px_2px_0px_0px_var(--background)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
        >
          <LogOut className="h-3.5 w-3.5 stroke-[2.5]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
