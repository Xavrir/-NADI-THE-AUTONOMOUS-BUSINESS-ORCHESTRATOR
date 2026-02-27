"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalsTab } from "./_components/approvals-tab";
import { ReviewTab } from "./_components/review-tab";
import { TasksTab } from "./_components/tasks-tab";

export default function InboxPage() {
  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Approvals, review queue, and operational tasks"
      />
      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList className="bg-[var(--surface)] border border-[var(--border)]">
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ApprovalsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="review">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ReviewTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="tasks">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <TasksTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
