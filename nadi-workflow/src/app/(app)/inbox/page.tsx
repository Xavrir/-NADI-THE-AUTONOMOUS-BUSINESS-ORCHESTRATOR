import { PageHeader } from "@/components/shared/page-header";

export default function InboxPage() {
  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Approvals, review queue, and operational tasks"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Inbox tabs will be built in Step 5
      </div>
    </div>
  );
}
