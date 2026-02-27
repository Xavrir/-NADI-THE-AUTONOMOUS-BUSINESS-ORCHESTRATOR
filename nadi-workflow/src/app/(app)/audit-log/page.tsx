import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogContent } from "./_content";

export default function AuditLogPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AuditLogContent />
    </Suspense>
  );
}
