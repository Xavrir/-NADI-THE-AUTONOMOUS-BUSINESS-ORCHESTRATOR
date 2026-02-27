"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Play, Zap, GitBranch, ShieldCheck, BarChart3, Loader2, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/status-chip";

interface TemplateNode {
  id: string;
  type: string;
  label: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isActive: boolean;
  configJson: {
    nodes: TemplateNode[];
    edges: Array<{ source: string; target: string; label?: string }>;
  };
  createdAt: string;
}

const typeIcons: Record<string, typeof Zap> = {
  trigger: Zap,
  logic: GitBranch,
  ai: BarChart3,
  confidence_gate: ShieldCheck,
  policy_check: ShieldCheck,
  approval: ShieldCheck,
  execute: Play,
  audit: ShieldCheck,
};

const typeColors: Record<string, string> = {
  trigger: "text-[var(--primary)]",
  logic: "text-[var(--info)]",
  ai: "text-purple-400",
  confidence_gate: "text-[var(--warning)]",
  policy_check: "text-[var(--warning)]",
  approval: "text-amber-400",
  execute: "text-[var(--success)]",
  audit: "text-[var(--text-muted)]",
};

export function TemplatesTab() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["workflow-templates"],
    queryFn: () => fetch("/api/workflows/templates").then((r) => r.json()),
  });

  const runMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch("/api/workflows/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, triggerType: "manual" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates?.map((tpl) => (
        <div
          key={tpl.id}
          className="card-elevated p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                {tpl.name}
              </h3>
              {tpl.description && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{tpl.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusChip
                variant={tpl.isActive ? "success" : "neutral"}
                label={tpl.isActive ? "Active" : "Inactive"}
              />
              <span className="font-mono text-xs text-[var(--text-muted)]">v{tpl.version}</span>
            </div>
          </div>

          {/* Node pipeline preview */}
          {tpl.configJson.nodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tpl.configJson.nodes.map((node, i) => {
                const Icon = typeIcons[node.type] ?? GitBranch;
                const color = typeColors[node.type] ?? "text-[var(--text-muted)]";
                return (
                  <div key={node.id} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-[var(--text-muted)] text-xs">&rarr;</span>
                    )}
                    <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
                      <Icon className={`h-3 w-3 ${color}`} />
                      <span className="text-xs text-[var(--text-secondary)]">{node.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tpl.configJson.nodes.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] italic">No nodes configured</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {tpl.configJson.nodes.length > 0 && (
              <Link href={`/workflows/builder?template=${tpl.id}`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <PenTool className="h-3.5 w-3.5" />
                  Builder
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={runMutation.isPending || tpl.configJson.nodes.length === 0}
              onClick={() => runMutation.mutate(tpl.id)}
            >
              {runMutation.isPending && runMutation.variables === tpl.id ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running...</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Run</>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
