"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LedgerTab } from "./_components/ledger-tab";
import { UnitEconomicsTab } from "./_components/unit-economics-tab";
import { CsvImportWizard } from "./_components/csv-import-wizard";

export default function FinancePage() {
  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Ledger, CSV import, and unit economics"
        actions={<CsvImportWizard />}
      />

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="bg-[var(--surface)] border border-[var(--border)]">
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="unit-economics">Unit Economics</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <LedgerTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="unit-economics">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <UnitEconomicsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
