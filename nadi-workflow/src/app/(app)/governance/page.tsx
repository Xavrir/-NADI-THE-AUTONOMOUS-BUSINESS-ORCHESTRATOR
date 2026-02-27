import { PageHeader } from "@/components/shared/page-header";

export default function GovernancePage() {
  return (
    <div>
      <PageHeader
        title="Governance"
        subtitle="Policies, approval rules, and access matrix"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Governance editor will be built in Step 11
      </div>
    </div>
  );
}
