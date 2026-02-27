import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowBuilderContent } from "./_content";

export default function WorkflowBuilderPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <WorkflowBuilderContent />
    </Suspense>
  );
}
