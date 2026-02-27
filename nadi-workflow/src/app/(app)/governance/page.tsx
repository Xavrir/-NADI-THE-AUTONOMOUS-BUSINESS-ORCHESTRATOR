"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Save, Loader2, Users, Lock, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PolicyData {
  id: string;
  version: number;
  confidenceThreshold: number;
  minMarginPct: number;
  maxDiscountPct: number;
  highValueThreshold: number;
  isActive: boolean;
  createdAt: string;
}

const ROLES = [
  { role: "Owner", permissions: ["approve", "reject", "configure_policy", "run_workflow", "view_audit", "manage_connectors"] },
  { role: "Operator", permissions: ["run_workflow", "import_csv", "view_audit", "review_items"] },
  { role: "System", permissions: ["execute_workflow", "write_audit", "classify_transactions", "compute_margins"] },
  { role: "Viewer", permissions: ["view_audit", "view_dashboard", "view_reports"] },
];

const ALL_PERMISSIONS = [
  "approve", "reject", "configure_policy", "run_workflow", "view_audit",
  "manage_connectors", "import_csv", "review_items", "execute_workflow",
  "write_audit", "classify_transactions", "compute_margins", "view_dashboard", "view_reports",
];

export default function GovernancePage() {
  const queryClient = useQueryClient();

  const { data: policy, isLoading } = useQuery<PolicyData>({
    queryKey: ["policy"],
    queryFn: () => fetch("/api/policies/current").then((r) => r.json()),
  });

  const [formState, setFormState] = useState<Partial<PolicyData>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PolicyData>) => {
      const res = await fetch("/api/policies/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      setFormState({});
    },
  });

  const currentValues = {
    confidenceThreshold: formState.confidenceThreshold ?? policy?.confidenceThreshold ?? 0.9,
    minMarginPct: formState.minMarginPct ?? policy?.minMarginPct ?? 0.2,
    maxDiscountPct: formState.maxDiscountPct ?? policy?.maxDiscountPct ?? 0.15,
    highValueThreshold: formState.highValueThreshold ?? policy?.highValueThreshold ?? 2000000,
  };

  const hasChanges = Object.keys(formState).length > 0;

  return (
    <div>
      <PageHeader
        title="Governance"
        subtitle="Policies, approval rules, and access matrix"
      />

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="bg-[var(--surface)] border border-[var(--border)]">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="roles">Role Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              {/* Version badge */}
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
                <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                  Policy v{policy?.version ?? 1}
                </span>
                <StatusChip variant="success" label="Active" />
                {hasChanges && (
                  <StatusChip variant="warning" label="Unsaved changes" />
                )}
              </div>

              {/* Policy fields */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="card-elevated p-5 space-y-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">AI Confidence Gate</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--text-muted)]">
                      Confidence Threshold (below this → review queue)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={currentValues.confidenceThreshold}
                        onChange={(e) => setFormState((s) => ({ ...s, confidenceThreshold: Number(e.target.value) }))}
                        className="border-[var(--border)] bg-[var(--surface)] font-mono"
                      />
                      <span className="text-sm text-[var(--text-muted)]">
                        ({(currentValues.confidenceThreshold * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-elevated p-5 space-y-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Margin Sentinel</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--text-muted)]">Minimum Net Margin %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={currentValues.minMarginPct}
                        onChange={(e) => setFormState((s) => ({ ...s, minMarginPct: Number(e.target.value) }))}
                        className="border-[var(--border)] bg-[var(--surface)] font-mono"
                      />
                      <span className="text-sm text-[var(--text-muted)]">
                        ({(currentValues.minMarginPct * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-elevated p-5 space-y-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Discount Limits</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--text-muted)]">Maximum Discount %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={currentValues.maxDiscountPct}
                        onChange={(e) => setFormState((s) => ({ ...s, maxDiscountPct: Number(e.target.value) }))}
                        className="border-[var(--border)] bg-[var(--surface)] font-mono"
                      />
                      <span className="text-sm text-[var(--text-muted)]">
                        ({(currentValues.maxDiscountPct * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-elevated p-5 space-y-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">High-Value Transactions</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--text-muted)]">Threshold (IDR) — requires approval</Label>
                    <Input
                      type="number"
                      step="100000"
                      min="0"
                      value={currentValues.highValueThreshold}
                      onChange={(e) => setFormState((s) => ({ ...s, highValueThreshold: Number(e.target.value) }))}
                      className="border-[var(--border)] bg-[var(--surface)] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => updateMutation.mutate(formState)}
                  disabled={!hasChanges || updateMutation.isPending}
                  className="gap-2 bg-[var(--primary)] text-white hover:opacity-90"
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save as v{(policy?.version ?? 0) + 1}</>
                  )}
                </Button>
              </div>

              {updateMutation.isSuccess && (
                <p className="text-sm text-[var(--success)]">Policy updated successfully. New version is active.</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles">
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Role-based access matrix for Kopi Nadi workspace. Roles are system-defined in the MVP.
            </p>

            <div className="overflow-auto card-elevated">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Permission
                    </th>
                    {ROLES.map((r) => (
                      <th key={r.role} className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        <div className="flex flex-col items-center gap-1">
                          {r.role === "Owner" && <Lock className="h-3.5 w-3.5 text-[var(--primary)]" />}
                          {r.role === "Operator" && <Users className="h-3.5 w-3.5 text-[var(--info)]" />}
                          {r.role === "System" && <ShieldCheck className="h-3.5 w-3.5 text-[var(--warning)]" />}
                          {r.role === "Viewer" && <Eye className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
                          {r.role}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERMISSIONS.map((perm) => (
                    <tr key={perm} className="border-b border-[var(--border)]">
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">
                        {perm}
                      </td>
                      {ROLES.map((r) => (
                        <td key={r.role} className="px-4 py-2 text-center">
                          {r.permissions.includes(perm) ? (
                            <span className="inline-block h-3 w-3 rounded-full bg-[var(--primary)]" />
                          ) : (
                            <span className="inline-block h-3 w-3 rounded-full bg-[var(--border)]" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
