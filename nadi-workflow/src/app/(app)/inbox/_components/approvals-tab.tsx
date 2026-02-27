"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import { EvidenceChip } from "@/components/shared/evidence-chip";
import { DetailsDrawer, useDrawer } from "@/components/shared/details-drawer";

interface Approval {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  riskLevel: string;
  status: string;
  confidence: number | null;
  title: string;
  description: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  evidenceJson: Record<string, unknown> | null;
  createdAt: string;
}

const riskVariant = (risk: string) => {
  if (risk === "high") return "danger" as const;
  if (risk === "medium") return "warning" as const;
  return "info" as const;
};

export function ApprovalsTab() {
  const queryClient = useQueryClient();
  const drawer = useDrawer("approval");

  const { data: approvals = [], isLoading } = useQuery<Approval[]>({
    queryKey: ["inbox", "approvals"],
    queryFn: () => fetch("/api/inbox/approvals").then((r) => r.json()),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/approvals/${id}/approve`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/approvals/${id}/reject`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const activeApproval = approvals.find((a) => a.id === drawer.activeId);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-[var(--surface)] animate-pulse" />)}</div>;
  }

  if (approvals.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No approvals pending</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {approval.title}
                  </h3>
                  <StatusChip
                    variant={riskVariant(approval.riskLevel)}
                    label={approval.riskLevel}
                  />
                  {approval.status !== "pending" && (
                    <StatusChip
                      variant={approval.status === "approved" ? "success" : "danger"}
                      label={approval.status}
                    />
                  )}
                </div>
                {approval.description && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {approval.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  {approval.confidence !== null && (
                    <span>Confidence: {(approval.confidence * 100).toFixed(0)}%</span>
                  )}
                  <span>{approval.actionType.replace(/_/g, " ")}</span>
                  {typeof approval.evidenceJson?.evidenceId === "string" && (
                    <EvidenceChip evidenceId={approval.evidenceJson.evidenceId} />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => drawer.open(approval.id)}
                  className="h-8 w-8"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {approval.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 bg-[var(--success)] text-white hover:bg-[var(--success)]/90"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(approval.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)]/10"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(approval.id)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <DetailsDrawer drawerKey="approval" title="Approval Detail" subtitle={activeApproval?.title}>
        {activeApproval && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Before
              </h4>
              <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                {JSON.stringify(activeApproval.beforeJson, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                After
              </h4>
              <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                {JSON.stringify(activeApproval.afterJson, null, 2)}
              </pre>
            </div>
            {activeApproval.evidenceJson && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Evidence
                </h4>
                <pre className="rounded bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] overflow-x-auto font-mono">
                  {JSON.stringify(activeApproval.evidenceJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DetailsDrawer>
    </>
  );
}
