"use client";

import { useState } from "react";
import { Zap, GitBranch, Brain, ShieldCheck, Play, FileText, AlertTriangle, X, Code, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import { cn } from "@/lib/utils";

interface InspectorProps {
  node: {
    id: string;
    data: {
      label: string;
      nodeType: string;
      status?: string;
      config?: Record<string, unknown>;
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

const getStatusVariant = (status?: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "completed": return "success";
    case "running": return "info";
    case "failed": return "danger";
    default: return "neutral";
  }
};

export function NodeInspector({ node, onClose }: InspectorProps) {
  const [view, setView] = useState<"details" | "json">("details");

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
    <div className="flex h-full flex-col bg-[var(--card)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">Node Inspector</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView(view === "details" ? "json" : "details")}
            className="h-7 px-2 text-[10px] uppercase tracking-wider"
          >
            {view === "details" ? <Code className="mr-1 h-3 w-3" /> : <Info className="mr-1 h-3 w-3" />}
            {view === "details" ? "JSON View" : "Details"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {view === "details" ? (
          <>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-sm", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{node.data.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {node.data.nodeType.replace("_", " ")}
                </p>
              </div>
            </div>

            <section className="space-y-2 border-t border-[var(--border)] pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Current Status</h4>
              <StatusChip 
                variant={getStatusVariant(node.data.status)} 
                label={node.data.status?.toUpperCase() ?? "IDLE"} 
              />
            </section>

            <section className="space-y-2 border-t border-[var(--border)] pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Description</h4>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
            </section>

            <section className="space-y-2 border-t border-[var(--border)] pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Metadata</h4>
              <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Node ID</span>
                  <span className="font-mono text-[11px] text-[var(--text-primary)] bg-[var(--bg)] px-1.5 py-0.5 rounded-sm border border-[var(--border)]">{node.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Type</span>
                  <span className="font-mono text-[11px] text-[var(--text-secondary)]">{node.data.nodeType}</span>
                </div>
              </div>
            </section>

            <section className="space-y-2 border-t border-[var(--border)] pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Configuration</h4>
              {node.data.config ? (
                <div className="space-y-2">
                  {Object.entries(node.data.config).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-2">
                      <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{key}</span>
                      <span className="font-mono text-xs text-[var(--text-primary)]">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-[var(--border)] p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">No configuration defined</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="h-full space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Raw Node Data</h4>
            <pre className="h-[calc(100%-30px)] overflow-auto rounded-sm border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[11px] text-[var(--primary)]">
              {JSON.stringify(node, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
