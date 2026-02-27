import { PageHeader } from "@/components/shared/page-header";

export default function AuditLogPage() {
  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Timeline of all system events with evidence trails"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Audit log timeline will be built in Step 6
      </div>
    </div>
  );
}
