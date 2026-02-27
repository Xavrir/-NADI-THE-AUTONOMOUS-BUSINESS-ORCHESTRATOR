"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusChip } from "@/components/shared/status-chip";

interface ReviewItem {
  id: string;
  sourceType: string;
  sourceId: string | null;
  suggestedJson: { category?: string; confidence?: number; action?: string; reason?: string };
  confidence: number;
  status: string;
  createdAt: string;
}

const categories = [
  "COGS - Raw Materials",
  "COGS - Packaging",
  "COGS - Production Services",
  "Revenue - Online Sales",
  "Revenue - Platform Settlement",
  "Revenue - Walk-in",
  "Operating Expense - General",
  "Marketing Expense",
  "Logistics - Shipping",
  "Tax & Compliance",
  "Other",
];

const ACTION_LABELS: Record<string, string> = {
  manual_review_required: "Manual Review Required",
  fulfill: "Order Fulfillment",
  hold: "Order Held",
  hold_for_review: "Order Held for Review",
  auto_resolve_low_risk: "Auto-Resolved (Low Risk)",
  draft_price_change: "Price Change Draft",
  apply_price_change: "Price Change Applied",
  create_restock_order: "Restock Order",
  send_wa_message: "WhatsApp Notification",
  queue_wa_manual: "WhatsApp Manual Queue",
  draft_cs_response: "CS Response Draft",
  export_content_csv: "Content Export",
  post_ledger_entries: "Ledger Posted",
  create_review_item: "Review Required",
};

export function ReviewTab() {
  const queryClient = useQueryClient();
  const [fixes, setFixes] = useState<Record<string, string>>({});

  const { data: items = [], isLoading } = useQuery<ReviewItem[]>({
    queryKey: ["inbox", "review"],
    queryFn: () => fetch("/api/inbox/review").then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      fetch(`/api/review/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "review"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "ledger"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-[var(--surface)] animate-pulse" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No items to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 card-elevated border-l-2 border-l-[var(--warning)] p-4"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {item.suggestedJson.category
                  ?? ACTION_LABELS[item.suggestedJson.action ?? ""] 
                  ?? item.suggestedJson.action?.replace(/_/g, " ") 
                  ?? "Unknown"}
              </span>
              <StatusChip
                variant={item.status === "pending" ? "warning" : "success"}
                label={item.status}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Confidence: {(item.confidence * 100).toFixed(0)}% — Source: {item.sourceType}
              {item.sourceId ? ` (${item.sourceId})` : ""}
            </p>
          </div>
          {item.status === "pending" && (
            <div className="flex items-center gap-2">
              <Select
                value={fixes[item.id] ?? ""}
                onValueChange={(v) => setFixes((f) => ({ ...f, [item.id]: v }))}
              >
                <SelectTrigger className="w-52 h-8 text-xs bg-[var(--surface)] border-[var(--border)]">
                  <SelectValue placeholder="Fix category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                disabled={!fixes[item.id] || saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({ id: item.id, category: fixes[item.id] })
                }
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
