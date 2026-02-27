"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, GitBranch, Brain, ShieldCheck, Play, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowNodeData {
  label: string;
  nodeType: string;
  status?: "idle" | "running" | "completed" | "failed";
}

const typeConfig: Record<string, { icon: typeof Zap; accentClass: string; borderClass: string }> = {
  trigger: { icon: Zap, accentClass: "text-[var(--primary)]", borderClass: "border-[var(--primary)]/40" },
  logic: { icon: GitBranch, accentClass: "text-[var(--info)]", borderClass: "border-[var(--info)]/40" },
  ai: { icon: Brain, accentClass: "text-purple-400", borderClass: "border-purple-400/40" },
  confidence_gate: { icon: ShieldCheck, accentClass: "text-[var(--warning)]", borderClass: "border-[var(--warning)]/40" },
  policy_check: { icon: ShieldCheck, accentClass: "text-[var(--warning)]", borderClass: "border-[var(--warning)]/40" },
  approval: { icon: AlertTriangle, accentClass: "text-amber-400", borderClass: "border-amber-400/40" },
  execute: { icon: Play, accentClass: "text-[var(--success)]", borderClass: "border-[var(--success)]/40" },
  audit: { icon: FileText, accentClass: "text-[var(--text-muted)]", borderClass: "border-[var(--text-muted)]/40" },
};

const statusRing: Record<string, string> = {
  idle: "",
  running: "ring-2 ring-[var(--info)] ring-offset-2 ring-offset-[var(--bg)] animate-pulse",
  completed: "ring-2 ring-[var(--success)] ring-offset-2 ring-offset-[var(--bg)] transition-all duration-500",
  failed: "ring-2 ring-[var(--danger)] ring-offset-2 ring-offset-[var(--bg)] animate-shake",
};

function WorkflowNodeComponent({ data, selected }: NodeProps & { data: WorkflowNodeData }) {
  const cfg = typeConfig[data.nodeType] ?? typeConfig.logic;
  const Icon = cfg.icon;
  const status = data.status ?? "idle";

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-[var(--border)] !bg-[var(--surface)]"
      />
      <div
        className={cn(
          "min-w-[140px] rounded-sm border bg-[var(--card)] px-4 py-3 shadow-[4px_4px_0px_0px_var(--background)] transition-all",
          cfg.borderClass,
          selected && "border-[var(--primary)] shadow-[4px_4px_0px_0px_var(--primary)]",
          statusRing[status]
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[var(--surface)]", cfg.accentClass)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{data.label}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{data.nodeType.replace("_", " ")}</p>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-[var(--border)] !bg-[var(--surface)]"
      />
    </>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
