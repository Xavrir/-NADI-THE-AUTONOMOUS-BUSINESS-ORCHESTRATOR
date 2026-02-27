"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { EvidenceChip } from "@/components/shared/evidence-chip";
import { DetailsDrawer, useDrawer } from "@/components/shared/details-drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  eventType: string;
  actor: string;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  evidenceJson: Record<string, unknown> | null;
  policyJson: Record<string, unknown> | null;
  runId: string | null;
  approvalId: string | null;
  createdAt: string;
}

const eventVariant = (type: string) => {
  if (type.includes("approved") || type.includes("resolved")) return "success" as const;
  if (type.includes("rejected") || type.includes("failed")) return "danger" as const;
  if (type.includes("alert") || type.includes("review")) return "warning" as const;
  return "info" as const;
};

const eventTypes = [
  "all",
  "csv_import",
  "ledger_posted",
  "review_created",
  "review_resolved",
  "approval_created",
  "approval_resolved",
  "approval_rejected",
  "inventory_alert",
  "policy_check",
];

export function AuditLogContent() {
  const drawer = useDrawer("audit");
  const [filter, setFilter] = useState("all");

  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit"],
    queryFn: () => fetch("/api/audit").then((r) => r.json()),
  });

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.eventType === filter);

  const activeEntry = entries.find((e) => e.id === drawer.activeId);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Timeline of all system events with evidence trails"
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 h-8 text-xs bg-[var(--surface)] border-[var(--border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All events" : t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">No audit entries found</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
          <div className="space-y-0">
            {filtered.map((entry) => {
              const evidenceId =
                typeof entry.evidenceJson?.evidenceId === "string"
                  ? entry.evidenceJson.evidenceId
                  : null;

              return (
                <div
                  key={entry.id}
                  className="relative flex gap-4 py-3 pl-10 pr-4 cursor-pointer transition-colors hover:bg-[var(--surface)]/50 rounded-lg"
                  onClick={() => drawer.open(entry.id)}
                >
                  <div className="absolute left-2.5 top-5 h-3 w-3 rounded-full border-2 border-[var(--border)] bg-[var(--card)]" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusChip variant={eventVariant(entry.eventType)} label={entry.eventType.replace(/_/g, " ")} />
                      <span className="text-xs text-[var(--text-muted)]">
                        {format(new Date(entry.createdAt), "MMM d, HH:mm")}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        by {entry.actor}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {entry.summary}
                    </p>
                    <div className="flex items-center gap-2">
                      {evidenceId && <EvidenceChip evidenceId={evidenceId} />}
                      {entry.runId && (
                        <span className="evidence-id">{entry.runId}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DetailsDrawer drawerKey="audit" title="Audit Detail" subtitle={activeEntry?.summary}>
        {activeEntry && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Event</span>
                <p className="font-medium text-[var(--text-primary)]">{activeEntry.eventType}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Actor</span>
                <p className="font-medium text-[var(--text-primary)]">{activeEntry.actor}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Target</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {activeEntry.targetType}{activeEntry.targetId ? ` / ${activeEntry.targetId}` : ""}
                </p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Time</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {format(new Date(activeEntry.createdAt), "MMM d, yyyy HH:mm:ss")}
                </p>
              </div>
            </div>

            {activeEntry.beforeJson && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Before
                </h4>
                <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                  {JSON.stringify(activeEntry.beforeJson, null, 2)}
                </pre>
              </div>
            )}

            {activeEntry.afterJson && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  After
                </h4>
                <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                  {JSON.stringify(activeEntry.afterJson, null, 2)}
                </pre>
              </div>
            )}

            {activeEntry.evidenceJson && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Evidence
                </h4>
                <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                  {JSON.stringify(activeEntry.evidenceJson, null, 2)}
                </pre>
              </div>
            )}

            {activeEntry.policyJson && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Policy
                </h4>
                <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                  {JSON.stringify(activeEntry.policyJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}
