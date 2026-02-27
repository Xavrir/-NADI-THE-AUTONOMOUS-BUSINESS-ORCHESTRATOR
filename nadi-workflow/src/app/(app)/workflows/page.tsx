"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplatesTab } from "./_components/templates-tab";
import { RunsTab } from "./_components/runs-tab";

export default function WorkflowsPage() {
  return (
    <div>
      <PageHeader
        title="Workflows"
        subtitle="Templates, runs, and the visual builder"
      />

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="bg-[var(--surface)] border border-[var(--border)]">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <TemplatesTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="runs">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <RunsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
