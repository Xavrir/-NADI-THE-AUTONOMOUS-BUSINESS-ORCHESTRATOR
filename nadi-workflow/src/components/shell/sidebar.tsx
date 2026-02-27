"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-2 border-[var(--primary)] bg-[var(--card)] text-[var(--text-primary)]"
                  : "border-l-2 border-transparent text-[var(--sidebar-foreground)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.tag && (
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                  {item.tag}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
