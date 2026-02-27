import { PageHeader } from "@/components/shared/page-header";

export default function WorkflowsPage() {
  return (
    <div>
      <PageHeader
        title="Workflows"
        subtitle="Templates, runs, and the visual builder"
      />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--text-muted)]">
        Workflow templates and runs will be built in Step 9
      </div>
    </div>
  );
}
