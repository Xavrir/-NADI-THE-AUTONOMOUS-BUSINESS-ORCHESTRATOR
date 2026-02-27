import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function eid(suffix: string) {
  return `EVD-2026-${suffix}`;
}

async function main() {
  await prisma.product.createMany({
    data: [
      { sku: "KOPI-SUSU-250", name: "Kopi Susu 250ml", cogs: 8500, price: 18000, reorderPoint: 15 },
      { sku: "GULA-AREN-1L", name: "Gula Aren 1L", cogs: 32000, price: 55000, reorderPoint: 10 },
      { sku: "AMERICANO-ICED", name: "Iced Americano", cogs: 6000, price: 22000, reorderPoint: 20 },
      { sku: "LATTE-HOT", name: "Hot Latte", cogs: 9000, price: 25000, reorderPoint: 12 },
      { sku: "MATCHA-LATTE", name: "Matcha Latte", cogs: 12000, price: 28000, reorderPoint: 8 },
    ],
  });

  await prisma.inventory.createMany({
    data: [
      { sku: "KOPI-SUSU-250", available: 45 },
      { sku: "GULA-AREN-1L", available: 3 },
      { sku: "AMERICANO-ICED", available: 30 },
      { sku: "LATTE-HOT", available: 20 },
      { sku: "MATCHA-LATTE", available: 15 },
    ],
  });

  await prisma.unitEconomicsSnapshot.createMany({
    data: [
      { sku: "KOPI-SUSU-250", channel: "shopify", price: 18000, cogs: 8500, feePct: 0.05, netMarginPct: 0.478, status: "healthy" },
      { sku: "KOPI-SUSU-250", channel: "gofood", price: 18000, cogs: 8500, feePct: 0.25, netMarginPct: 0.278, status: "warning" },
      { sku: "GULA-AREN-1L", channel: "shopify", price: 55000, cogs: 32000, feePct: 0.05, netMarginPct: 0.368, status: "healthy" },
      { sku: "AMERICANO-ICED", channel: "shopify", price: 22000, cogs: 6000, feePct: 0.05, netMarginPct: 0.677, status: "healthy" },
      { sku: "AMERICANO-ICED", channel: "grabfood", price: 22000, cogs: 6000, feePct: 0.30, netMarginPct: 0.427, status: "warning" },
      { sku: "LATTE-HOT", channel: "shopify", price: 25000, cogs: 9000, feePct: 0.05, netMarginPct: 0.590, status: "healthy" },
      { sku: "MATCHA-LATTE", channel: "gofood", price: 28000, cogs: 12000, feePct: 0.25, netMarginPct: 0.321, status: "warning" },
      { sku: "MATCHA-LATTE", channel: "shopify", price: 28000, cogs: 12000, feePct: 0.05, netMarginPct: 0.521, status: "healthy" },
    ],
  });

  await prisma.policy.create({
    data: {
      version: 1,
      confidenceThreshold: 0.90,
      minMarginPct: 0.20,
      maxDiscountPct: 0.15,
      highValueThreshold: 2000000,
      isActive: true,
    },
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);

  await prisma.transactionRaw.createMany({
    data: [
      { id: "txn-001", date: twoDaysAgo, description: "Pembelian biji kopi arabika 10kg", debit: 850000, credit: 0, reference: "INV-2026-0041", source: "csv", importBatch: "batch-001" },
      { id: "txn-002", date: twoDaysAgo, description: "Penjualan Shopify #1042", debit: 0, credit: 396000, reference: "SHP-1042", source: "csv", importBatch: "batch-001" },
      { id: "txn-003", date: yesterday, description: "Bayar listrik toko Jan 2026", debit: 450000, credit: 0, reference: "PLN-01-2026", source: "csv", importBatch: "batch-001" },
      { id: "txn-004", date: yesterday, description: "Transfer dari GoFood settlement", debit: 0, credit: 1250000, reference: "GF-STL-0127", source: "csv", importBatch: "batch-001" },
      { id: "txn-005", date: now, description: "Beli gula aren 5L dari supplier", debit: 160000, credit: 0, reference: "SUP-GA-005", source: "csv", importBatch: "batch-002" },
      { id: "txn-006", date: now, description: "Penjualan walk-in customer", debit: 0, credit: 75000, reference: "WALK-0127-01", source: "manual" },
    ],
  });

  await prisma.ledgerEntry.createMany({
    data: [
      { transactionId: "txn-001", category: "COGS - Raw Materials", confidence: 0.96, evidenceId: eid("000001"), status: "posted", aiRationale: "Keyword 'biji kopi' matches raw material procurement pattern" },
      { transactionId: "txn-002", category: "Revenue - Online Sales", confidence: 0.98, evidenceId: eid("000002"), status: "posted", aiRationale: "Shopify order reference detected" },
      { transactionId: "txn-003", category: "Operating Expense - Utilities", confidence: 0.94, evidenceId: eid("000003"), status: "posted", aiRationale: "PLN reference matches electricity utility pattern" },
      { transactionId: "txn-004", category: "Revenue - Platform Settlement", confidence: 0.92, evidenceId: eid("000004"), status: "posted", aiRationale: "GoFood settlement transfer pattern" },
      { transactionId: "txn-005", category: "COGS - Raw Materials", confidence: 0.72, evidenceId: eid("000005"), status: "review", aiRationale: "Gula aren could be raw material or packaging — low confidence" },
      { transactionId: "txn-006", category: "Revenue - Walk-in", confidence: 0.65, evidenceId: eid("000006"), status: "review", aiRationale: "Walk-in sales without structured reference — needs review" },
    ],
  });

  await prisma.approval.createMany({
    data: [
      {
        id: "apr-001",
        actionType: "price_change",
        targetType: "product",
        targetId: "KOPI-SUSU-250",
        riskLevel: "medium",
        status: "pending",
        confidence: 0.88,
        title: "Price increase: Kopi Susu 250ml on GoFood",
        description: "Margin below threshold on GoFood channel. Recommended price increase from Rp 18,000 to Rp 21,000.",
        beforeJson: JSON.stringify({ price: 18000, channel: "gofood", netMarginPct: 0.278 }),
        afterJson: JSON.stringify({ price: 21000, channel: "gofood", netMarginPct: 0.445 }),
        evidenceJson: JSON.stringify({ evidenceId: eid("000010"), pipeline: "P2", runId: "RUN-P2-001" }),
      },
      {
        id: "apr-002",
        actionType: "restock",
        targetType: "inventory",
        targetId: "GULA-AREN-1L",
        riskLevel: "high",
        status: "pending",
        confidence: 1.0,
        title: "Emergency restock: Gula Aren 1L",
        description: "Stock at 3 units, below reorder point of 10. Restock order for 20 units recommended.",
        beforeJson: JSON.stringify({ available: 3, reorderPoint: 10 }),
        afterJson: JSON.stringify({ orderQty: 20, estimatedCost: 640000 }),
        evidenceJson: JSON.stringify({ evidenceId: eid("000011"), pipeline: "P5", runId: "RUN-P5-001" }),
      },
      {
        id: "apr-003",
        actionType: "promo_stop",
        targetType: "campaign",
        targetId: "PROMO-MATCHA-FEB",
        riskLevel: "low",
        status: "approved",
        confidence: 0.95,
        title: "Stop promo: Matcha Latte GoFood 20% off",
        description: "Promo causing margin to drop below minimum policy threshold.",
        beforeJson: JSON.stringify({ discount: 0.20, netMarginPct: 0.121 }),
        afterJson: JSON.stringify({ discount: 0, netMarginPct: 0.321 }),
        evidenceJson: JSON.stringify({ evidenceId: eid("000012"), pipeline: "P2" }),
        resolvedBy: "owner",
        resolvedAt: yesterday,
      },
    ],
  });

  await prisma.reviewItem.createMany({
    data: [
      {
        id: "rev-001",
        sourceType: "ledger",
        sourceId: "txn-005",
        suggestedJson: JSON.stringify({ category: "COGS - Raw Materials", confidence: 0.72 }),
        confidence: 0.72,
        status: "pending",
      },
      {
        id: "rev-002",
        sourceType: "ledger",
        sourceId: "txn-006",
        suggestedJson: JSON.stringify({ category: "Revenue - Walk-in", confidence: 0.65 }),
        confidence: 0.65,
        status: "pending",
      },
      {
        id: "rev-003",
        sourceType: "order_classification",
        sourceId: "ORD-GF-1099",
        suggestedJson: JSON.stringify({ action: "fulfill", confidence: 0.78, reason: "Ambiguous address format" }),
        confidence: 0.78,
        status: "pending",
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      { id: "tsk-001", title: "Review low-confidence ledger entries from batch-002", status: "open", priority: "high", dueDate: now, sourceType: "pipeline", sourceId: "P1" },
      { id: "tsk-002", title: "Confirm restock order for Gula Aren 1L with supplier", status: "open", priority: "high", dueDate: new Date(now.getTime() + 86400000), sourceType: "approval", sourceId: "apr-002" },
      { id: "tsk-003", title: "Update GoFood menu pricing after approval", status: "open", priority: "medium", dueDate: new Date(now.getTime() + 172800000), sourceType: "approval", sourceId: "apr-001" },
      { id: "tsk-004", title: "Reconcile walk-in sales receipts for January", status: "open", priority: "low", dueDate: new Date(now.getTime() + 604800000), sourceType: "manual" },
    ],
  });

  const fcTemplate = await prisma.workflowTemplate.create({
    data: {
      id: "tpl-finance-close",
      name: "Finance Close",
      description: "Import CSV, classify transactions, post ledger entries, flag review items",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "CSV Import", config: { triggerType: "csv_import" } },
          { id: "normalize", type: "logic", label: "Normalize & Dedupe", config: { task: "normalize_deduplicate" } },
          { id: "classify", type: "ai", label: "AI Classification", config: { task: "classify_ledger_row" } },
          { id: "confidence", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.9 } },
          { id: "post", type: "execute", label: "Post to Ledger", config: { actionType: "post_ledger_entries" } },
          { id: "review", type: "execute", label: "Route to Review", config: { actionType: "create_review_item" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "workflow_executed" } },
        ],
        edges: [
          { source: "trigger", target: "normalize" },
          { source: "normalize", target: "classify" },
          { source: "classify", target: "confidence" },
          { source: "confidence", target: "post", label: "high" },
          { source: "confidence", target: "review", label: "low" },
          { source: "post", target: "audit" },
          { source: "review", target: "audit" },
        ],
      }),
    },
  });

  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-margin-sentinel",
      name: "Margin & Fee Sentinel",
      description: "Compute margins per SKU per channel, flag breaches, draft price changes",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "Schedule / Manual", config: { triggerType: "manual" } },
          { id: "fetch", type: "logic", label: "Fetch Unit Economics", config: { task: "fetch_unit_economics" } },
          { id: "compute", type: "logic", label: "Compute Net Margin", config: { task: "compute_net_margin" } },
          { id: "policy", type: "policy_check", label: "Policy Check", config: { policyKey: "margin_check" } },
          { id: "draft", type: "execute", label: "Draft Price Change", config: { actionType: "draft_price_change" } },
          { id: "approval", type: "approval", label: "Owner Approval", config: { approvalType: "owner" } },
          { id: "execute", type: "execute", label: "Apply Change", config: { actionType: "apply_price_change" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "workflow_executed" } },
        ],
        edges: [
          { source: "trigger", target: "fetch" },
          { source: "fetch", target: "compute" },
          { source: "compute", target: "policy" },
          { source: "policy", target: "draft" },
          { source: "draft", target: "approval" },
          { source: "approval", target: "execute" },
          { source: "execute", target: "audit" },
        ],
      }),
    },
  });

  await prisma.workflowTemplate.createMany({
    data: [
      {
        id: "tpl-marketing-weekly",
        name: "Marketing Weekly Factory",
        description: "Generate weekly content plan and social media packs",
        version: 1,
        configJson: JSON.stringify({ nodes: [], edges: [] }),
      },
      {
        id: "tpl-order-ops",
        name: "New Order Ops",
        description: "Process incoming orders, check stock, route actions",
        version: 1,
        configJson: JSON.stringify({ nodes: [], edges: [] }),
      },
    ],
  });

  const run = await prisma.workflowRun.create({
    data: {
      id: "run-001",
      templateId: fcTemplate.id,
      triggerType: "csv_import",
      status: "completed",
      summaryJson: JSON.stringify({ imported: 6, posted: 4, review: 2, errors: 0 }),
      startedAt: yesterday,
      completedAt: yesterday,
    },
  });

  await prisma.nodeRun.createMany({
    data: [
      { runId: run.id, nodeId: "trigger", nodeType: "trigger", status: "completed", outputJson: JSON.stringify({ rowCount: 6 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "normalize", nodeType: "logic", status: "completed", outputJson: JSON.stringify({ unique: 6, duplicates: 0 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "classify", nodeType: "ai", status: "completed", outputJson: JSON.stringify({ classified: 6, avgConfidence: 0.862 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "confidence", nodeType: "confidence_gate", status: "completed", outputJson: JSON.stringify({ passed: 4, routed: 2 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "post", nodeType: "execute", status: "completed", outputJson: JSON.stringify({ posted: 4 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "review", nodeType: "execute", status: "completed", outputJson: JSON.stringify({ reviewItems: 2 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "audit", nodeType: "audit", status: "completed", outputJson: JSON.stringify({ entries: 6 }), startedAt: yesterday, completedAt: yesterday },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { eventType: "csv_import", actor: "system", targetType: "batch", targetId: "batch-001", summary: "Imported 4 transactions from CSV batch-001", evidenceJson: JSON.stringify({ evidenceId: eid("000020"), batchId: "batch-001", rowCount: 4 }), runId: "run-001", createdAt: twoDaysAgo },
      { eventType: "ledger_posted", actor: "system", targetType: "transaction", targetId: "txn-001", summary: "Posted: Pembelian biji kopi arabika — COGS Raw Materials", evidenceJson: JSON.stringify({ evidenceId: eid("000001"), confidence: 0.96 }), createdAt: twoDaysAgo },
      { eventType: "review_created", actor: "system", targetType: "transaction", targetId: "txn-005", summary: "Low confidence (0.72) — routed to review queue", evidenceJson: JSON.stringify({ evidenceId: eid("000005"), confidence: 0.72 }), createdAt: now },
      { eventType: "approval_created", actor: "pipeline:P2", targetType: "approval", targetId: "apr-001", summary: "Price change approval created for Kopi Susu 250ml on GoFood", evidenceJson: JSON.stringify({ evidenceId: eid("000010"), pipeline: "P2" }), createdAt: yesterday },
      { eventType: "approval_resolved", actor: "owner", targetType: "approval", targetId: "apr-003", summary: "Approved: Stop promo Matcha Latte GoFood 20% off", beforeJson: JSON.stringify({ status: "pending" }), afterJson: JSON.stringify({ status: "approved", resolvedBy: "owner" }), evidenceJson: JSON.stringify({ evidenceId: eid("000012") }), approvalId: "apr-003", createdAt: yesterday },
      { eventType: "inventory_alert", actor: "pipeline:P5", targetType: "inventory", targetId: "GULA-AREN-1L", summary: "Low stock alert: Gula Aren 1L at 3 units (reorder point: 10)", evidenceJson: JSON.stringify({ evidenceId: eid("000011"), available: 3, reorderPoint: 10 }), createdAt: now },
      { eventType: "policy_check", actor: "system", targetType: "product", targetId: "KOPI-SUSU-250", summary: "Margin below threshold on GoFood: 27.8% < 20% min — PASS (above min but flagged)", policyJson: JSON.stringify({ minMarginPct: 0.20, actual: 0.278, result: "flagged" }), createdAt: yesterday },
    ],
  });

  await prisma.connectorConfig.createMany({
    data: [
      { type: "shopify", name: "Shopify Store", status: "active", configJson: JSON.stringify({ shop: "kopinadi.myshopify.com" }) },
      { type: "csv_importer", name: "Bank CSV Importer", status: "active" },
      { type: "whatsapp", name: "WhatsApp Sender", status: "inactive" },
      { type: "social_scheduler", name: "Social Scheduler", status: "inactive" },
    ],
  });

  console.log("Seed completed: Kopi Nadi workspace");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
