"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { TrendingUp, TrendingDown, Edit3, Loader2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIDR } from "@/lib/utils";

interface EconRow {
  id: string;
  sku: string;
  productName: string;
  channel: string;
  price: number;
  cogs: number;
  feePct: number;
  netMarginPct: number;
  status: string;
  createdAt: string;
}

interface DraftResult {
  approvalId: string;
  riskLevel: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  violations: string[];
}

const statusMap: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
  healthy: { variant: "success", label: "Healthy" },
  warning: { variant: "warning", label: "Warning" },
  critical: { variant: "danger", label: "Critical" },
};

const channelBadgeColor: Record<string, string> = {
  shopify: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  gofood: "bg-red-500/10 text-red-400 border-red-500/20",
  grabfood: "bg-green-500/10 text-green-400 border-green-500/20",
  tokopedia: "bg-emerald-600/10 text-emerald-300 border-emerald-600/20",
};

export function UnitEconomicsTab() {
  const [editRow, setEditRow] = useState<EconRow | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<EconRow[]>({
    queryKey: ["unit-economics"],
    queryFn: () => fetch("/api/finance/unit-economics").then((r) => r.json()),
  });

  const draftMutation = useMutation({
    mutationFn: async (payload: { sku: string; channel: string; newPrice: number }) => {
      const res = await fetch("/api/finance/draft-price-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<DraftResult>;
    },
    onSuccess: (result) => {
      setDraftResult(result);
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const handleSubmitDraft = () => {
    if (!editRow || !newPrice) return;
    const price = Math.round(Number(newPrice));
    if (isNaN(price) || price <= 0) return;
    draftMutation.mutate({ sku: editRow.sku, channel: editRow.channel, newPrice: price });
  };

  const handleCloseDialog = () => {
    setEditRow(null);
    setNewPrice("");
    setDraftResult(null);
    draftMutation.reset();
  };

  // Summary metrics
  const summary = useMemo(() => {
    if (!data) return null;
    const healthy = data.filter((r) => r.status === "healthy").length;
    const warning = data.filter((r) => r.status === "warning").length;
    const critical = data.filter((r) => r.status === "critical").length;
    const avgMargin = data.reduce((sum, r) => sum + r.netMarginPct, 0) / (data.length || 1);
    return { healthy, warning, critical, avgMargin, total: data.length };
  }, [data]);

  const columns: ColumnDef<EconRow>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{row.original.productName}</p>
            <p className="font-mono text-xs text-[var(--text-muted)]">{row.original.sku}</p>
          </div>
        ),
      },
      {
        accessorKey: "channel",
        header: "Channel",
        cell: ({ getValue }) => {
          const ch = getValue() as string;
          return (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${channelBadgeColor[ch] ?? "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"}`}>
              {ch}
            </span>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-[var(--text-primary)]">{formatIDR(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: "cogs",
        header: "COGS",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-[var(--text-secondary)]">{formatIDR(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: "feePct",
        header: "Fee %",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-[var(--text-muted)]">{((getValue() as number) * 100).toFixed(0)}%</span>
        ),
      },
      {
        accessorKey: "netMarginPct",
        header: "Net Margin",
        cell: ({ getValue }) => {
          const pct = getValue() as number;
          const Icon = pct >= 0.3 ? TrendingUp : TrendingDown;
          const color = pct >= 0.3 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-[var(--danger)]";
          return (
            <div className={`flex items-center gap-1.5 ${color}`}>
              <Icon className="h-3.5 w-3.5" />
              <span className="font-mono text-sm font-medium">{(pct * 100).toFixed(1)}%</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Health",
        cell: ({ getValue }) => {
          const st = getValue() as string;
          const cfg = statusMap[st] ?? { variant: "neutral" as const, label: st };
          return <StatusChip variant={cfg.variant} label={cfg.label} />;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-[var(--text-muted)] hover:text-[var(--primary)]"
            onClick={(e) => {
              e.stopPropagation();
              setEditRow(row.original);
              setNewPrice(String(row.original.price));
            }}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Draft
          </Button>
        ),
      },
    ],
    []
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      {/* Summary cards */}
      {summary && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Avg Margin</p>
            <p className="font-mono text-xl font-bold text-[var(--text-primary)]">
              {(summary.avgMargin * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Healthy</p>
            <p className="font-mono text-xl font-bold text-[var(--success)]">{summary.healthy}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Warning</p>
            <p className="font-mono text-xl font-bold text-[var(--warning)]">{summary.warning}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Critical</p>
            <p className="font-mono text-xl font-bold text-[var(--danger)]">{summary.critical}</p>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={data ?? []} />

      {/* Draft Price Change Dialog */}
      <Dialog open={editRow !== null && draftResult === null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)]">
              Draft Price Change
            </DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{editRow.productName}</p>
                <p className="font-mono text-xs text-[var(--text-muted)]">{editRow.sku} / {editRow.channel}</p>
                <p className="text-sm text-[var(--text-secondary)]">Current: {formatIDR(editRow.price)}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-[var(--text-muted)]">New Price (IDR)</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="border-[var(--border)] bg-[var(--card)] font-mono"
                />
              </div>

              {/* Live preview */}
              {newPrice && Number(newPrice) > 0 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Preview:</p>
                  <p className="text-[var(--text-primary)]">
                    Fee: {formatIDR(Math.round(Number(newPrice) * editRow.feePct))}
                    {" | "}Net: {formatIDR(Number(newPrice) - editRow.cogs - Math.round(Number(newPrice) * editRow.feePct))}
                    {" | "}Margin: {(((Number(newPrice) - editRow.cogs - Math.round(Number(newPrice) * editRow.feePct)) / Number(newPrice)) * 100).toFixed(1)}%
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
                <Button
                  onClick={handleSubmitDraft}
                  disabled={draftMutation.isPending || !newPrice}
                  className="gap-2 bg-[var(--primary)] text-white hover:opacity-90"
                >
                  {draftMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    "Submit for Approval"
                  )}
                </Button>
              </div>

              {draftMutation.isError && (
                <p className="text-sm text-[var(--danger)]">
                  {draftMutation.error instanceof Error ? draftMutation.error.message : "Failed"}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Draft Result Dialog */}
      <Dialog open={draftResult !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)]">
              Approval Created
            </DialogTitle>
          </DialogHeader>
          {draftResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--info-muted)] bg-[var(--info-muted)]/10 p-4">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    Sent to Inbox for approval
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Risk level: <span className={draftResult.riskLevel === "high" ? "text-[var(--danger)]" : draftResult.riskLevel === "medium" ? "text-[var(--warning)]" : "text-[var(--success)]"}>{draftResult.riskLevel}</span>
                  </p>
                </div>
              </div>

              {draftResult.violations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Policy Violations</p>
                  {draftResult.violations.map((v, i) => (
                    <p key={i} className="text-sm text-[var(--danger)]">{v}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleCloseDialog} className="bg-[var(--primary)] text-white hover:opacity-90">
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
