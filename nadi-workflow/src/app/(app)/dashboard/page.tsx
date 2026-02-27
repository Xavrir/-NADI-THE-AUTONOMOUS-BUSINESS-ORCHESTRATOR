"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Bell,
  AlertTriangle,
  ArrowRight,
  FileText,
  Clock,
  Play,
  Upload,
  BarChart3,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

interface DashboardData {
  kpis: {
    cashToday: number;
    revenueThisWeek: number;
    marginHealth: string;
    pendingApprovals: number;
  };
  risks: Array<{ type: string; label: string; severity: string }>;
  suggestedActions: Array<{ action: string; label: string; href: string }>;
  recentAudit: Array<{ id: string; eventType: string; summary: string; createdAt: string }>;
}

const DEMO_STEPS = [
  {
    step: 1,
    title: "Import Transactions",
    description: "Upload a bank CSV to trigger the Finance Close pipeline",
    href: "/finance",
    icon: Upload,
    cta: "Open Finance",
  },
  {
    step: 2,
    title: "Review Low-Confidence Items",
    description: "Check the Inbox for transactions flagged by the AI classifier",
    href: "/inbox",
    icon: ShieldCheck,
    cta: "Open Inbox",
  },
  {
    step: 3,
    title: "Check Unit Economics",
    description: "View margins per SKU per channel, draft a price change",
    href: "/finance",
    icon: BarChart3,
    cta: "View Economics",
  },
  {
    step: 4,
    title: "Run a Workflow",
    description: "Open the Builder, visualize the pipeline, and trigger a run",
    href: "/workflows/builder?template=tpl-finance-close",
    icon: GitBranch,
    cta: "Open Builder",
  },
  {
    step: 5,
    title: "Trace the Audit Trail",
    description: "Every action has evidence — verify the complete trail",
    href: "/audit-log",
    icon: FileText,
    cta: "View Audit Log",
  },
];

export default function DashboardPage() {
  const [showDemo, setShowDemo] = useState(true);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Kopi Nadi operational overview" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const risks = data?.risks ?? [];
  const actions = data?.suggestedActions ?? [];
  const audit = data?.recentAudit ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Kopi Nadi operational overview"
        actions={
          <Button
            variant={showDemo ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowDemo(!showDemo)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showDemo ? "Hide Demo Guide" : "Demo Guide"}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Demo Mode Banner */}
        {showDemo && (
          <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Guided Demo — 2-Minute Walkthrough
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {DEMO_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <Link key={step.step} href={step.href}>
                    <div className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2 transition-all hover:border-[var(--primary)]/50 hover:shadow-md">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                          {step.step}
                        </span>
                        <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                      </div>
                      <h3 className="text-xs font-medium text-[var(--text-primary)]">{step.title}</h3>
                      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">{step.description}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] group-hover:underline">
                        {step.cta} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <DollarSign className="h-3.5 w-3.5" />
              Net Cash Position
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
              {formatIDR(kpis?.cashToday ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <TrendingUp className="h-3.5 w-3.5" />
              Revenue (Posted)
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--success)]">
              {formatIDR(kpis?.revenueThisWeek ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Margin Health
            </div>
            <StatusChip
              variant={kpis?.marginHealth === "healthy" ? "success" : "warning"}
              label={kpis?.marginHealth === "healthy" ? "Healthy" : "Attention Needed"}
              className="mt-1"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Bell className="h-3.5 w-3.5" />
              Pending Approvals
            </div>
            <p className={`font-mono text-2xl font-bold ${(kpis?.pendingApprovals ?? 0) > 0 ? "text-[var(--warning)]" : "text-[var(--text-primary)]"}`}>
              {kpis?.pendingApprovals ?? 0}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Risks + Actions */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              Active Risks
            </h2>
            {risks.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--text-muted)]">
                No active risks detected
              </div>
            ) : (
              <div className="space-y-2">
                {risks.map((risk, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${risk.severity === "danger" ? "bg-[var(--danger)]" : "bg-[var(--warning)]"}`} />
                    <p className="text-sm text-[var(--text-secondary)]">{risk.label}</p>
                  </div>
                ))}
              </div>
            )}

            <h2 className="flex items-center gap-2 pt-2 text-sm font-medium text-[var(--text-primary)]">
              <ArrowRight className="h-4 w-4 text-[var(--primary)]" />
              Suggested Actions
            </h2>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <Link key={i} href={action.href}>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-colors hover:bg-[var(--surface)]">
                    <p className="text-sm text-[var(--text-primary)]">{action.label}</p>
                    <ArrowRight className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Audit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <FileText className="h-4 w-4 text-[var(--primary)]" />
                Recent Activity
              </h2>
              <Link href="/audit-log">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {audit.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--text-muted)]">
                No recent activity
              </div>
            ) : (
              <div className="space-y-0 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                {audit.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 p-3 ${i < audit.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]">
                      <Clock className="h-3 w-3 text-[var(--text-muted)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text-primary)]">{entry.summary}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          {entry.eventType}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(entry.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
