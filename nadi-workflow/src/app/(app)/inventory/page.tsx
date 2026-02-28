"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Package, AlertTriangle, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryRow {
  sku: string;
  productName: string;
  available: number;
  reserved: number;
  reorderPoint: number;
  status: "ok" | "low" | "critical";
}

interface ProductData {
  sku: string;
  name: string;
  reorderPoint: number;
  inventory: { available: number; reserved: number } | null;
}

export default function InventoryPage() {
  const { data: raw, isLoading } = useQuery<ProductData[]>({
    queryKey: ["inventory"],
    queryFn: () => fetch("/api/inventory").then((r) => r.json()),
  });

  const rows: InventoryRow[] = useMemo(() => {
    if (!raw) return [];
    return raw.map((p) => {
      const available = p.inventory?.available ?? 0;
      const reserved = p.inventory?.reserved ?? 0;
      const status: "ok" | "low" | "critical" =
        available <= p.reorderPoint * 0.5 ? "critical" :
        available <= p.reorderPoint ? "low" : "ok";
      return {
        sku: p.sku,
        productName: p.name,
        available,
        reserved,
        reorderPoint: p.reorderPoint,
        status,
      };
    });
  }, [raw]);

  const lowStockCount = rows.filter((r) => r.status === "low").length;

  const columns: ColumnDef<InventoryRow>[] = useMemo(
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
        accessorKey: "available",
        header: "Available",
        cell: ({ row }) => {
          const { available, status } = row.original;
          const color = status === "critical" ? "text-[var(--danger)]" : status === "low" ? "text-[var(--warning)]" : "text-[var(--text-primary)]";
          return <span className={`font-mono text-sm font-medium ${color}`}>{available}</span>;
        },
      },
      {
        accessorKey: "reserved",
        header: "Reserved",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-[var(--text-muted)]">{getValue() as number}</span>
        ),
      },
      {
        accessorKey: "reorderPoint",
        header: "Reorder Point",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-[var(--text-secondary)]">{getValue() as number}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const st = getValue() as string;
          if (st === "critical") return <StatusChip variant="danger" label="Critical" />;
          if (st === "low") return <StatusChip variant="warning" label="Low Stock" />;
          return <StatusChip variant="success" label="OK" />;
        },
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, low stock alerts, and restock tasks"
      />

      <div className="space-y-4">
        {isLoading ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-sm" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-sm" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="card-elevated p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--primary)]" />
                  <p className="text-xs text-[var(--text-muted)]">Total SKUs</p>
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{rows.length}</p>
              </div>
              <div className="card-elevated p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                  <p className="text-xs text-[var(--text-muted)]">Low Stock</p>
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-[var(--warning)]">{lowStockCount}</p>
              </div>
              <div className="card-elevated p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[var(--danger)]" />
                  <p className="text-xs text-[var(--text-muted)]">Critical</p>
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-[var(--danger)]">
                  {rows.filter((r) => r.status === "critical").length}
                </p>
              </div>
            </div>
            <DataTable columns={columns} data={rows} />
          </>
        )}
      </div>
    </div>
  );
}
