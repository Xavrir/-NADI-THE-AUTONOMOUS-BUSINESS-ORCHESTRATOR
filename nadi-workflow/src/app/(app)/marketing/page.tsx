import { PageHeader } from "@/components/shared/page-header";

export default function MarketingPage() {
  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle="Weekly content factory and campaign calendar"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Marketing calendar will be built in Step 12
      </div>
    </div>
  );
}
