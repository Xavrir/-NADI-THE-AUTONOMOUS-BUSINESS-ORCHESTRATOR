"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Truck, CreditCard, BarChart3, Plug, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/status-chip";

interface Connector {
  id: string;
  type: string;
  name: string;
  status: string;
  configJson: Record<string, unknown> | null;
  lastSyncAt: string | null;
  createdAt: string;
}

const connectorIcons: Record<string, typeof ShoppingBag> = {
  shopify: ShoppingBag,
  logistics: Truck,
  payment: CreditCard,
  analytics: BarChart3,
};

const connectorDescriptions: Record<string, string> = {
  shopify: "Sync orders, products, and inventory from your Shopify store.",
  logistics: "Connect to JNE, SiCepat, or other Indonesian logistics providers.",
  payment: "Integrate with payment gateways for transaction reconciliation.",
  analytics: "Export data to Google Analytics or Metabase for reporting.",
};

const statusMap: Record<string, { variant: "success" | "warning" | "neutral"; label: string }> = {
  active: { variant: "success", label: "Connected" },
  inactive: { variant: "neutral", label: "Not Connected" },
  error: { variant: "warning", label: "Error" },
};

export default function SettingsPage() {
  const { data: connectors, isLoading } = useQuery<Connector[]>({
    queryKey: ["integrations"],
    queryFn: () => fetch("/api/settings/integrations").then((r) => r.json()),
  });

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Integrations, connectors, and system configuration"
      />

      <div className="space-y-6">
        {/* Connectors grid */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <Plug className="h-4 w-4 text-[var(--primary)]" />
            Integrations
          </h2>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {connectors?.map((conn) => {
                const Icon = connectorIcons[conn.type] ?? Plug;
                const desc = connectorDescriptions[conn.type] ?? "External integration.";
                const st = statusMap[conn.status] ?? statusMap.inactive;

                return (
                  <div
                    key={conn.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface)]">
                          <Icon className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[var(--text-primary)]">{conn.name}</h3>
                          <p className="text-xs text-[var(--text-muted)]">{conn.type}</p>
                        </div>
                      </div>
                      <StatusChip variant={st.variant} label={st.label} />
                    </div>

                    <p className="text-sm text-[var(--text-secondary)]">{desc}</p>

                    {conn.lastSyncAt && (
                      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <RefreshCw className="h-3 w-3" />
                        Last sync: {new Date(conn.lastSyncAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" disabled>
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* System info */}
        <section>
          <h2 className="mb-4 text-sm font-medium text-[var(--text-primary)]">System</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Database</span>
              <span className="font-mono text-[var(--text-secondary)]">SQLite (dev)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">LLM Provider</span>
              <span className="font-mono text-[var(--text-secondary)]">Stub (keyword classifier)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Version</span>
              <span className="font-mono text-[var(--text-secondary)]">MVP 0.4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Workspace</span>
              <span className="font-mono text-[var(--text-secondary)]">Kopi Nadi</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
