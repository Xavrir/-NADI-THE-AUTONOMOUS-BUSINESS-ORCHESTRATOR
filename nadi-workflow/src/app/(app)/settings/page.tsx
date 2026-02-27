"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Truck, CreditCard, BarChart3, Plug, RefreshCw, Brain, RotateCcw } from "lucide-react";
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
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const { data: connectors, isLoading } = useQuery<Connector[]>({
    queryKey: ["integrations"],
    queryFn: () => fetch("/api/settings/integrations").then((r) => r.json()),
  });

  const { data: llmSettings, isLoading: isLlmLoading } = useQuery<{ provider: "stub" | "pollinations" }>({
    queryKey: ["llm-provider"],
    queryFn: () => fetch("/api/settings/llm-provider").then((r) => r.json()),
  });

  const handleToggleProvider = async (provider: "stub" | "pollinations") => {
    setIsToggling(true);
    try {
      await fetch("/api/settings/llm-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await queryClient.invalidateQueries({ queryKey: ["llm-provider"] });
    } catch (error) {
      console.error("Failed to toggle provider:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/settings/reset-demo", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetResult("Demo data reset successfully");
        queryClient.invalidateQueries();
      } else {
        setResetResult("Reset failed: " + (data.error ?? "unknown error"));
      }
    } catch {
      setResetResult("Reset failed: network error");
    } finally {
      setIsResetting(false);
    }
  };

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
                    className="card-elevated p-5 space-y-4"
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

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
            <Brain className="h-4 w-4 text-[var(--primary)]" />
            AI Engine
          </h2>

          <div className="card-elevated p-5">
            {isLlmLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div 
                  className={`flex flex-col justify-between border p-4 rounded-sm transition-all ${
                    llmSettings?.provider === "stub" 
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-[4px_4px_0px_0px_var(--primary)]" 
                      : "border-[var(--border)] shadow-[4px_4px_0px_0px_var(--background)]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-tight">Stub (Deterministic)</h3>
                      {llmSettings?.provider === "stub" && <StatusChip variant="neutral" label="Active" />}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Deterministic responses for testing. No external API calls.
                    </p>
                  </div>
                  
                  {llmSettings?.provider !== "stub" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 w-full rounded-sm border-[var(--border)] font-mono uppercase tracking-tighter"
                      onClick={() => handleToggleProvider("stub")}
                      disabled={isToggling}
                    >
                      {isToggling ? "Switching..." : "Switch"}
                    </Button>
                  )}
                </div>

                <div 
                  className={`flex flex-col justify-between border p-4 rounded-sm transition-all ${
                    llmSettings?.provider === "pollinations" 
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-[4px_4px_0px_0px_var(--primary)]" 
                      : "border-[var(--border)] shadow-[4px_4px_0px_0px_var(--background)]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-tight">Pollinations AI</h3>
                      {llmSettings?.provider === "pollinations" && <StatusChip variant="success" label="Active" />}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      GPT-OSS 20B via Pollinations. Free, no API key required.
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                      ~5-15s per call
                    </p>
                  </div>

                  {llmSettings?.provider !== "pollinations" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 w-full rounded-sm border-[var(--border)] font-mono uppercase tracking-tighter"
                      onClick={() => handleToggleProvider("pollinations")}
                      disabled={isToggling}
                    >
                      {isToggling ? "Switching..." : "Switch"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* System info */}
        <section>
          <h2 className="mb-4 text-sm font-medium text-[var(--text-primary)]">System</h2>
            <div className="card-elevated p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Database</span>
               <span className="font-mono text-[var(--text-secondary)]">SQLite (dev)</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-[var(--text-muted)]">LLM Provider</span>
               <span className="font-mono text-[var(--text-secondary)]">
                 {llmSettings?.provider === "pollinations" ? "Pollinations AI" : "Stub (Deterministic)"}
               </span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-[var(--text-muted)]">Version</span>
               <span className="font-mono text-[var(--text-secondary)]">MVP 0.4</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-[var(--text-muted)]">Workspace</span>
               <span className="font-mono text-[var(--text-secondary)]">NADI Streetwear</span>
             </div>
           </div>
         </section>

        {/* Demo Controls */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <RotateCcw className="h-4 w-4 text-[var(--primary)]" />
            Demo Controls
          </h2>

          <div className="card-elevated p-5 space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Reset all data to the original NADI Streetwear demo state. This will clear all workflow runs, approvals, and audit entries.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleResetDemo}
                disabled={isResetting}
                className="btn-glow gap-2 w-fit"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reset Demo Data
                  </>
                )}
              </Button>

              {resetResult && (
                <p className={`text-xs font-mono ${resetResult.includes("successfully") ? "text-green-500" : "text-red-500"}`}>
                  {resetResult}
                </p>
              )}
            </div>
          </div>
        </section>
       </div>
     </div>
   );
 }
