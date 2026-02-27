"use client";

import { Headphones, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";

const TICKETS = [
  {
    id: "CS-2026-0147",
    customer: "Andi Prasetyo",
    subject: "Order #ORD-8841 not delivered after 5 days",
    channel: "WhatsApp",
    priority: "high",
    status: "escalated",
    age: "2d 4h",
    assignee: "System",
  },
  {
    id: "CS-2026-0148",
    customer: "Siti Rahayu",
    subject: "Wrong item received — Kopi Susu instead of Matcha Latte",
    channel: "Shopee Chat",
    priority: "medium",
    status: "open",
    age: "1d 12h",
    assignee: "Operator",
  },
  {
    id: "CS-2026-0149",
    customer: "Budi Santoso",
    subject: "Request for bulk order pricing (50 pcs/week)",
    channel: "Email",
    priority: "low",
    status: "open",
    age: "6h",
    assignee: "Operator",
  },
  {
    id: "CS-2026-0150",
    customer: "Dewi Lestari",
    subject: "Packaging damage on arrival — photo attached",
    channel: "Tokopedia",
    priority: "medium",
    status: "resolved",
    age: "3d",
    assignee: "System",
  },
  {
    id: "CS-2026-0151",
    customer: "Rizky Fauzan",
    subject: "Loyalty points not credited after purchase",
    channel: "WhatsApp",
    priority: "low",
    status: "resolved",
    age: "5d",
    assignee: "Operator",
  },
];

const priorityColors: Record<string, string> = {
  high: "text-[var(--danger)]",
  medium: "text-[var(--warning)]",
  low: "text-[var(--text-muted)]",
};

const statusMap: Record<string, { variant: "success" | "warning" | "danger" | "info" | "neutral"; label: string }> = {
  escalated: { variant: "danger", label: "Escalated" },
  open: { variant: "warning", label: "Open" },
  resolved: { variant: "success", label: "Resolved" },
  closed: { variant: "neutral", label: "Closed" },
};

export default function CsConsolePage() {
  const openCount = TICKETS.filter((t) => t.status === "open" || t.status === "escalated").length;
  const escalatedCount = TICKETS.filter((t) => t.status === "escalated").length;

  return (
    <div>
      <PageHeader
        title="CS Console"
        subtitle="Customer service tickets — read only"
      />

      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-[var(--primary)]" />
              <p className="text-xs text-[var(--text-muted)]">Total Tickets</p>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{TICKETS.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--warning)]" />
              <p className="text-xs text-[var(--text-muted)]">Open</p>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--warning)]">{openCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
              <p className="text-xs text-[var(--text-muted)]">Escalated</p>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--danger)]">{escalatedCount}</p>
          </div>
        </div>

        {/* Ticket list */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
          {TICKETS.map((ticket, i) => {
            const st = statusMap[ticket.status] ?? statusMap.open;
            return (
              <div
                key={ticket.id}
                className={`flex items-start gap-4 p-4 ${i < TICKETS.length - 1 ? "border-b border-[var(--border)]" : ""}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--primary)]">{ticket.id}</span>
                    <StatusChip variant={st.variant} label={st.label} />
                    <span className={`text-xs font-medium uppercase ${priorityColors[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{ticket.subject}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>{ticket.customer}</span>
                    <span>{ticket.channel}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ticket.age}
                    </span>
                  </div>
                </div>
                {ticket.status === "escalated" && (
                  <div className="flex items-center gap-1 rounded border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-2 py-1 text-xs text-[var(--danger)]">
                    <ArrowUpRight className="h-3 w-3" />
                    Task created
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
