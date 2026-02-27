"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Clock, XCircle, Loader2, ChevronRight } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/status-chip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NodeRunData {
  id: string;
  nodeId: string;
  nodeType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  outputJson: { label?: string; message?: string } | null;
}

interface RunRow {
  id: string;
  templateId: string;
  templateName: string;
  triggerType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  summaryJson: { nodesCompleted?: number; nodesFailed?: number; duration?: number } | null;
  nodeRuns: NodeRunData[];
  createdAt: string;
}

const runStatusMap: Record<string, { variant: "success" | "warning" | "danger" | "info" | "neutral"; label: string }> = {
  completed: { variant: "success", label: "Completed" },
  running: { variant: "info", label: "Running" },
  failed: { variant: "danger", label: "Failed" },
  queued: { variant: "neutral", label: "Queued" },
};

const nodeStatusIcon: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  running: Loader2,
  failed: XCircle,
  pending: Clock,
};

const nodeStatusColor: Record<string, string> = {
  completed: "text-[var(--success)]",
  running: "text-[var(--info)]",
  failed: "text-[var(--danger)]",
  pending: "text-[var(--text-muted)]",
};

export function RunsTab() {
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);

  const { data, isLoading } = useQuery<RunRow[]>({
    queryKey: ["workflow-runs"],
    queryFn: () => fetch("/api/workflows/runs").then((r) => r.json()),
  });

  const columns: ColumnDef<RunRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Run ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-[var(--primary)]">
            {(getValue() as string).slice(0, 12)}...
          </span>
        ),
      },
      {
        accessorKey: "templateName",
        header: "Workflow",
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-[var(--text-primary)]">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "triggerType",
        header: "Trigger",
        cell: ({ getValue }) => (
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const st = getValue() as string;
          const cfg = runStatusMap[st] ?? { variant: "neutral" as const, label: st };
          return <StatusChip variant={cfg.variant} label={cfg.label} />;
        },
      },
      {
        id: "nodes",
        header: "Nodes",
        cell: ({ row }) => {
          const summary = row.original.summaryJson;
          const total = row.original.nodeRuns.length;
          const completed = summary?.nodesCompleted ?? row.original.nodeRuns.filter((n) => n.status === "completed").length;
          return (
            <span className="font-mono text-sm text-[var(--text-secondary)]">
              {completed}/{total}
            </span>
          );
        },
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => {
          const s = row.original.startedAt;
          const e = row.original.completedAt;
          if (!s) return <span className="text-sm text-[var(--text-muted)]">—</span>;
          const ms = e ? new Date(e).getTime() - new Date(s).getTime() : Date.now() - new Date(s).getTime();
          return <span className="font-mono text-sm text-[var(--text-secondary)]">{(ms / 1000).toFixed(1)}s</span>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => (
          <span className="text-sm text-[var(--text-muted)]">
            {new Date(getValue() as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        ),
      },
      {
        id: "detail",
        header: "",
        cell: () => <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />,
      },
    ],
    []
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <DataTable
        columns={columns}
        data={data ?? []}
        onRowClick={(row) => setSelectedRun(row)}
      />

      {/* Run Detail Dialog */}
      <Dialog open={selectedRun !== null} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="max-w-lg border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)]">
              Run Detail
            </DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4">
              {/* Run info */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{selectedRun.templateName}</p>
                  <p className="font-mono text-xs text-[var(--text-muted)]">{selectedRun.id}</p>
                </div>
                {(() => {
                  const cfg = runStatusMap[selectedRun.status];
                  return cfg ? <StatusChip variant={cfg.variant} label={cfg.label} /> : null;
                })()}
              </div>

              {/* Node timeline */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Node Timeline
                </h3>
                <div className="space-y-0">
                  {selectedRun.nodeRuns.map((node, i) => {
                    const Icon = nodeStatusIcon[node.status] ?? Clock;
                    const color = nodeStatusColor[node.status] ?? "text-[var(--text-muted)]";
                    const isLast = i === selectedRun.nodeRuns.length - 1;

                    return (
                      <div key={node.id} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] ${color}`}>
                            <Icon className={`h-3 w-3 ${node.status === "running" ? "animate-spin" : ""}`} />
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-[var(--border)]" />}
                        </div>

                        {/* Node content */}
                        <div className={`pb-3 ${isLast ? "" : ""}`}>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {node.outputJson?.label ?? node.nodeId}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="uppercase">{node.nodeType}</span>
                            {node.startedAt && node.completedAt && (
                              <span className="font-mono">
                                {((new Date(node.completedAt).getTime() - new Date(node.startedAt).getTime()) / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                          {node.outputJson?.message && (
                            <p className="mt-0.5 text-xs text-[var(--text-muted)] italic">
                              {node.outputJson.message}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
