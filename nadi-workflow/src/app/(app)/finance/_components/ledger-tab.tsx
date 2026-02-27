"use client";

import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { EvidenceChip } from "@/components/shared/evidence-chip";
import { DetailsDrawer, useDrawer } from "@/components/shared/details-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/utils";

interface LedgerRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  reference: string | null;
  category: string;
  confidence: number;
  evidenceId: string;
  status: string;
  aiRationale: string | null;
  createdAt: string;
}

const statusMap: Record<string, { variant: "success" | "warning" | "neutral"; label: string }> = {
  posted: { variant: "success", label: "Posted" },
  needs_review: { variant: "warning", label: "Needs Review" },
  draft: { variant: "neutral", label: "Draft" },
};

const categoryColors: Record<string, string> = {
  revenue: "text-[var(--success)]",
  cogs: "text-[var(--danger)]",
  opex: "text-[var(--warning)]",
  marketing: "text-[var(--info)]",
  logistics: "text-[var(--text-secondary)]",
  tax: "text-[var(--text-muted)]",
  other: "text-[var(--text-muted)]",
};

export function LedgerTab() {
  const { data, isLoading } = useQuery<LedgerRow[]>({
    queryKey: ["ledger"],
    queryFn: () => fetch("/api/finance/ledger").then((r) => r.json()),
  });

  const drawer = useDrawer("ledger-detail");
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id");

  const activeEntry = useMemo(
    () => data?.find((e) => e.id === activeId),
    [data, activeId]
  );

  const columns: ColumnDef<LedgerRow>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => {
          const d = new Date(getValue() as string);
          return (
            <span className="whitespace-nowrap text-sm text-[var(--text-secondary)]">
              {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => {
          const cat = getValue() as string;
          return (
            <span className={`text-xs font-medium uppercase tracking-wider ${categoryColors[cat] ?? categoryColors.other}`}>
              {cat}
            </span>
          );
        },
      },
      {
        accessorKey: "debit",
        header: "Debit",
        cell: ({ getValue }) => {
          const val = getValue() as number;
          return val > 0 ? (
            <span className="font-mono text-sm text-[var(--danger)]">{formatIDR(val)}</span>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">—</span>
          );
        },
      },
      {
        accessorKey: "credit",
        header: "Credit",
        cell: ({ getValue }) => {
          const val = getValue() as number;
          return val > 0 ? (
            <span className="font-mono text-sm text-[var(--success)]">{formatIDR(val)}</span>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">—</span>
          );
        },
      },
      {
        accessorKey: "confidence",
        header: "Confidence",
        cell: ({ getValue }) => {
          const conf = getValue() as number;
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round(conf * 100)}%`,
                    backgroundColor: conf >= 0.9 ? "var(--success)" : conf >= 0.7 ? "var(--warning)" : "var(--danger)",
                  }}
                />
              </div>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {(conf * 100).toFixed(0)}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const st = getValue() as string;
          const cfg = statusMap[st] ?? { variant: "neutral" as const, label: st };
          return <StatusChip variant={cfg.variant} label={cfg.label} />;
        },
      },
      {
        accessorKey: "evidenceId",
        header: "Evidence",
        cell: ({ getValue }) => <EvidenceChip evidenceId={getValue() as string} />,
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
        onRowClick={(row) => drawer.open(row.id)}
      />

      <DetailsDrawer
        drawerKey="ledger-detail"
        title="Ledger Entry"
        subtitle={activeEntry?.evidenceId}
      >
        {activeEntry && (
          <div className="space-y-5">
            {/* Transaction info */}
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Transaction
              </h3>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Date</span>
                  <span className="text-sm text-[var(--text-primary)]">
                    {new Date(activeEntry.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Description</span>
                  <span className="text-sm text-[var(--text-primary)]">{activeEntry.description}</span>
                </div>
                {activeEntry.debit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-muted)]">Debit</span>
                    <span className="font-mono text-sm text-[var(--danger)]">{formatIDR(activeEntry.debit)}</span>
                  </div>
                )}
                {activeEntry.credit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-muted)]">Credit</span>
                    <span className="font-mono text-sm text-[var(--success)]">{formatIDR(activeEntry.credit)}</span>
                  </div>
                )}
                {activeEntry.reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-muted)]">Reference</span>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">{activeEntry.reference}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Classification */}
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                AI Classification
              </h3>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Category</span>
                  <span className={`text-sm font-medium uppercase ${categoryColors[activeEntry.category] ?? ""}`}>
                    {activeEntry.category}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-muted)]">Confidence</span>
                  <span className="font-mono text-sm text-[var(--text-primary)]">
                    {(activeEntry.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {activeEntry.aiRationale && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] italic">{activeEntry.aiRationale}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Evidence */}
            <section className="flex justify-center pt-2">
              <EvidenceChip evidenceId={activeEntry.evidenceId} variant="stamp" />
            </section>
          </div>
        )}
      </DetailsDrawer>
    </>
  );
}
