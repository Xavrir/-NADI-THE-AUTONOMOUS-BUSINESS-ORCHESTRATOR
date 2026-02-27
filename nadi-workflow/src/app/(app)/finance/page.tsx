import { PageHeader } from "@/components/shared/page-header";

export default function FinancePage() {
  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Ledger, CSV import, and unit economics"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Finance ledger and CSV import will be built in Step 7
      </div>
    </div>
  );
}
