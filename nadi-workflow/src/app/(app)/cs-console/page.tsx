import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";

export default function CSConsolePage() {
  return (
    <div>
      <PageHeader
        title="CS Console"
        subtitle="Customer support overview and escalation queue"
        actions={
          <Badge variant="outline" className="border-[var(--border)] text-[var(--text-muted)]">
            Read Only
          </Badge>
        }
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        CS Console will be built in Step 12
      </div>
    </div>
  );
}
