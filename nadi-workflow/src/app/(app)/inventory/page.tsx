import { PageHeader } from "@/components/shared/page-header";

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, reorder points, and restock tasks"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Inventory management will be built in Step 12
      </div>
    </div>
  );
}
