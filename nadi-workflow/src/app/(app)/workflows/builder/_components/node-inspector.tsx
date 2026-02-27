"use client";

import { Zap, GitBranch, Brain, ShieldCheck, Play, FileText, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InspectorProps {
  node: {
    id: string;
    data: {
      label: string;
      nodeType: string;
      status?: string;
    };
  } | null;
  onClose: () => void;
}

const typeDescriptions: Record<string, string> = {
  trigger: "Entry point that starts the workflow. Can be manual, scheduled, or event-driven.",
  logic: "Processes data, transforms inputs, or applies business rules deterministically.",
  ai: "Routes to an AI model for classification, summarization, or extraction. Output must follow JSON schema.",
  confidence_gate: "Evaluates confidence scores against policy thresholds. Routes high/low confidence to different paths.",
  policy_check: "Validates actions against business policies (margins, discounts, risk levels).",
  approval: "Pauses workflow and creates an approval request. Resumes when owner approves or rejects.",
  execute: "Performs a side-effect: writes to database, calls external API, or posts ledger entries.",
  audit: "Writes an audit log entry with evidence IDs, before/after state, and policy references.",
};

const typeIcons: Record<string, typeof Zap> = {
  trigger: Zap,
  logic: GitBranch,
  ai: Brain,
  confidence_gate: ShieldCheck,
  policy_check: ShieldCheck,
  approval: AlertTriangle,
  execute: Play,
  audit: FileText,
};

const typeColors: Record<string, string> = {
  trigger: "text-[var(--primary)] bg-[var(--primary)]/10",
  logic: "text-[var(--info)] bg-[var(--info)]/10",
  ai: "text-purple-400 bg-purple-400/10",
  confidence_gate: "text-[var(--warning)] bg-[var(--warning)]/10",
  policy_check: "text-[var(--warning)] bg-[var(--warning)]/10",
  approval: "text-amber-400 bg-amber-400/10",
  execute: "text-[var(--success)] bg-[var(--success)]/10",
  audit: "text-[var(--text-muted)] bg-[var(--text-muted)]/10",
};

export function NodeInspector({ node, onClose }: InspectorProps) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-[var(--text-muted)]">Select a node to inspect</p>
      </div>
    );
  }

  const Icon = typeIcons[node.data.nodeType] ?? GitBranch;
  const color = typeColors[node.data.nodeType] ?? "text-[var(--text-muted)] bg-[var(--surface)]";
  const description = typeDescriptions[node.data.nodeType] ?? "Custom node type.";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">Node Inspector</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Node identity */}
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{node.data.label}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {node.data.nodeType.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Description */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Description</h4>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
        </section>

        {/* Metadata */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Metadata</h4>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Node ID</span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">{node.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Type</span>
              <span className="text-xs text-[var(--text-secondary)]">{node.data.nodeType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Status</span>
              <span className="text-xs text-[var(--text-secondary)]">{node.data.status ?? "idle"}</span>
            </div>
          </div>
        </section>

        {/* Config JSON placeholder */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Configuration</h4>
          <pre className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs text-[var(--text-muted)]">
{JSON.stringify({ nodeId: node.id, type: node.data.nodeType, label: node.data.label }, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
