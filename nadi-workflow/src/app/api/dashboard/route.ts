import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [
    pendingApprovals,
    pendingReviews,
    openTasks,
    recentAudit,
    lowStockItems,
    ledgerEntries,
    unitEcon,
  ] = await Promise.all([
    prisma.approval.count({ where: { status: "pending" } }),
    prisma.reviewItem.count({ where: { status: "pending" } }),
    prisma.task.count({ where: { status: "open" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.inventory.findMany({
      where: { available: { lte: 10 } },
      include: { product: true },
    }),
    prisma.ledgerEntry.findMany({
      where: { status: "posted" },
      include: { transaction: true },
    }),
    prisma.unitEconomicsSnapshot.findMany({
      where: { status: "warning" },
      include: { product: true },
    }),
  ]);

  const cashIn = ledgerEntries.reduce(
    (sum, e) => sum + e.transaction.credit,
    0
  );
  const cashOut = ledgerEntries.reduce(
    (sum, e) => sum + e.transaction.debit,
    0
  );

  const kpis = {
    cashToday: cashIn - cashOut,
    revenueThisWeek: cashIn,
    marginHealth: unitEcon.length === 0 ? "healthy" : "warning",
    pendingApprovals,
  };

  const risks = [
    ...(unitEcon.length > 0
      ? [{ type: "margin_breach", label: `${unitEcon.length} SKU(s) below margin threshold`, severity: "warning" }]
      : []),
    ...(pendingReviews > 0
      ? [{ type: "review_backlog", label: `${pendingReviews} item(s) need review`, severity: "warning" }]
      : []),
    ...lowStockItems.map((i) => ({
      type: "low_stock",
      label: `${i.product.name}: ${i.available} units left`,
      severity: i.available <= 3 ? "danger" : "warning",
    })),
  ];

  const suggestedActions = [
    ...(pendingApprovals > 0
      ? [{ action: "review_approvals", label: "Review pending approvals", href: "/inbox" }]
      : []),
    ...(pendingReviews > 0
      ? [{ action: "review_items", label: "Fix low-confidence entries", href: "/inbox" }]
      : []),
    { action: "run_finance_close", label: "Run Finance Close", href: "/workflows" },
  ];

  return NextResponse.json({
    kpis,
    risks,
    suggestedActions,
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      eventType: a.eventType,
      summary: a.summary,
      createdAt: a.createdAt,
    })),
  });
}
