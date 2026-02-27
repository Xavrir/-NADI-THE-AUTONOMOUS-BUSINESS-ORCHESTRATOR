import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function eid(suffix: string) {
  return `EVD-2026-${suffix}`;
}

async function main() {
  // Demo user (plaintext password — MVP only)
  await prisma.user.create({
    data: {
      id: "user_owner",
      name: "Owner",
      email: "owner@nadi.local",
      password: "password123",
    },
  });

  await prisma.product.createMany({
    data: [
      { sku: "NADI-TEE-BLK-OS", name: "Oversized Tee - Shadow Black", cogs: 65000, price: 189000, reorderPoint: 20 },
      { sku: "NADI-CARGO-GRY", name: "Cargo Jogger - Stone Grey", cogs: 120000, price: 349000, reorderPoint: 10 },
      { sku: "NADI-HOOD-OLV", name: "Hoodie - Washed Olive", cogs: 155000, price: 459000, reorderPoint: 8 },
      { sku: "NADI-CAP-CRMBLK", name: "Snapback Cap - Cream/Black", cogs: 35000, price: 129000, reorderPoint: 25 },
      { sku: "NADI-SLING-BLK", name: "Sling Bag - Tactical Black", cogs: 85000, price: 279000, reorderPoint: 12 },
      { sku: "NADI-TEE-JKT", name: "Graphic Tee - Jakarta Skyline", cogs: 55000, price: 159000, reorderPoint: 20 },
      { sku: "NADI-SHORT-NVY", name: "Track Shorts - Midnight Navy", cogs: 70000, price: 219000, reorderPoint: 15 },
    ],
  });

  await prisma.inventory.createMany({
    data: [
      { sku: "NADI-TEE-BLK-OS", available: 45 },
      { sku: "NADI-CARGO-GRY", available: 22 },
      { sku: "NADI-HOOD-OLV", available: 18 },
      { sku: "NADI-CAP-CRMBLK", available: 60 },
      { sku: "NADI-SLING-BLK", available: 3 },
      { sku: "NADI-TEE-JKT", available: 35 },
      { sku: "NADI-SHORT-NVY", available: 28 },
    ],
  });

  await prisma.unitEconomicsSnapshot.createMany({
    data: [
      { sku: "NADI-TEE-BLK-OS", channel: "shopify", price: 189000, cogs: 65000, feePct: 0.05, netMarginPct: 0.606, status: "healthy" },
      { sku: "NADI-TEE-BLK-OS", channel: "tokopedia", price: 189000, cogs: 65000, feePct: 0.12, netMarginPct: 0.536, status: "healthy" },
      { sku: "NADI-CARGO-GRY", channel: "shopify", price: 349000, cogs: 120000, feePct: 0.05, netMarginPct: 0.608, status: "healthy" },
      { sku: "NADI-CARGO-GRY", channel: "tiktok_shop", price: 349000, cogs: 120000, feePct: 0.18, netMarginPct: 0.476, status: "warning" },
      { sku: "NADI-HOOD-OLV", channel: "shopify", price: 459000, cogs: 155000, feePct: 0.05, netMarginPct: 0.612, status: "healthy" },
      { sku: "NADI-CAP-CRMBLK", channel: "shopify", price: 129000, cogs: 35000, feePct: 0.05, netMarginPct: 0.679, status: "healthy" },
      { sku: "NADI-CAP-CRMBLK", channel: "tokopedia", price: 129000, cogs: 35000, feePct: 0.12, netMarginPct: 0.609, status: "healthy" },
      { sku: "NADI-SLING-BLK", channel: "tiktok_shop", price: 279000, cogs: 85000, feePct: 0.18, netMarginPct: 0.515, status: "warning" },
      { sku: "NADI-TEE-JKT", channel: "shopify", price: 159000, cogs: 55000, feePct: 0.05, netMarginPct: 0.604, status: "healthy" },
      { sku: "NADI-SHORT-NVY", channel: "shopify", price: 219000, cogs: 70000, feePct: 0.05, netMarginPct: 0.630, status: "healthy" },
      { sku: "NADI-SHORT-NVY", channel: "tiktok_shop", price: 219000, cogs: 70000, feePct: 0.18, netMarginPct: 0.500, status: "warning" },
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
      { id: "txn-001", date: twoDaysAgo, description: "Pembelian kain cotton combed 30s 100m", debit: 3200000, credit: 0, reference: "INV-2026-0041", source: "csv", importBatch: "batch-001" },
      { id: "txn-002", date: twoDaysAgo, description: "Penjualan Shopify #1042 Oversized Tee x3 + Cap x2", debit: 0, credit: 825000, reference: "SHP-1042", source: "csv", importBatch: "batch-001" },
      { id: "txn-003", date: yesterday, description: "Bayar jasa sablon DTG 200 pcs", debit: 1400000, credit: 0, reference: "SUP-DTG-0127", source: "csv", importBatch: "batch-001" },
      { id: "txn-004", date: yesterday, description: "Transfer dari Tokopedia settlement", debit: 0, credit: 2850000, reference: "TKP-STL-0127", source: "csv", importBatch: "batch-001" },
      { id: "txn-005", date: now, description: "Beli packaging box custom 500 pcs", debit: 750000, credit: 0, reference: "SUP-PKG-005", source: "csv", importBatch: "batch-002" },
      { id: "txn-006", date: now, description: "Penjualan TikTok Shop Hoodie x2", debit: 0, credit: 918000, reference: "TTS-0227-01", source: "manual" },
    ],
  });

  await prisma.ledgerEntry.createMany({
    data: [
      { transactionId: "txn-001", category: "COGS - Raw Materials", confidence: 0.96, evidenceId: eid("000001"), status: "posted", aiRationale: "Keyword 'kain cotton' matches raw material procurement for garment production" },
      { transactionId: "txn-002", category: "Revenue - Online Sales", confidence: 0.98, evidenceId: eid("000002"), status: "posted", aiRationale: "Shopify order reference detected — multi-item sale" },
      { transactionId: "txn-003", category: "COGS - Production Services", confidence: 0.94, evidenceId: eid("000003"), status: "posted", aiRationale: "DTG printing service matches production cost pattern" },
      { transactionId: "txn-004", category: "Revenue - Platform Settlement", confidence: 0.92, evidenceId: eid("000004"), status: "posted", aiRationale: "Tokopedia settlement transfer pattern" },
      { transactionId: "txn-005", category: "COGS - Packaging", confidence: 0.68, evidenceId: eid("000005"), status: "review", aiRationale: "Custom packaging could be COGS or marketing expense — low confidence" },
      { transactionId: "txn-006", category: "Revenue - Online Sales", confidence: 0.62, evidenceId: eid("000006"), status: "review", aiRationale: "TikTok Shop sale without structured reference — needs review" },
    ],
  });

  await prisma.approval.createMany({
    data: [
       {
         id: "apr-001",
         actionType: "price_change",
         targetType: "product",
         targetId: "NADI-CARGO-GRY",
         riskLevel: "medium",
         status: "pending",
         confidence: 0.88,
         title: "Price increase: Cargo Jogger on TikTok Shop",
         description: "Margin below threshold on TikTok Shop channel (18% fee). Recommended price increase from Rp 349,000 to Rp 399,000.",
         beforeJson: JSON.stringify({ price: 349000, channel: "tiktok_shop", netMarginPct: 0.476 }),
         afterJson: JSON.stringify({ sku: "NADI-CARGO-GRY", price: 399000, channel: "tiktok_shop", cogs: 120000, feePct: 0.18, netMarginPct: 0.571, status: "warning" }),
         evidenceJson: JSON.stringify({ evidenceId: eid("000010"), pipeline: "P2", runId: "RUN-P2-001" }),
       },
      {
        id: "apr-002",
        actionType: "restock",
        targetType: "inventory",
        targetId: "NADI-SLING-BLK",
        riskLevel: "high",
        status: "pending",
        confidence: 1.0,
        title: "Emergency restock: Sling Bag - Tactical Black",
        description: "Stock at 3 units, below reorder point of 12. Restock order for 30 units recommended.",
        beforeJson: JSON.stringify({ available: 3, reorderPoint: 12 }),
        afterJson: JSON.stringify({ orderQty: 30, estimatedCost: 2550000 }),
        evidenceJson: JSON.stringify({ evidenceId: eid("000011"), pipeline: "P5", runId: "RUN-P5-001" }),
      },
      {
        id: "apr-003",
        actionType: "promo_stop",
        targetType: "campaign",
        targetId: "PROMO-HOODIE-FEB",
        riskLevel: "low",
        status: "approved",
        confidence: 0.95,
        title: "Stop promo: Hoodie Washed Olive TikTok 25% off",
        description: "Promo causing margin to drop below minimum policy threshold on TikTok Shop.",
        beforeJson: JSON.stringify({ discount: 0.25, netMarginPct: 0.087 }),
        afterJson: JSON.stringify({ discount: 0, netMarginPct: 0.612 }),
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
        suggestedJson: JSON.stringify({ category: "COGS - Packaging", confidence: 0.68 }),
        confidence: 0.68,
        status: "pending",
      },
      {
        id: "rev-002",
        sourceType: "ledger",
        sourceId: "txn-006",
        suggestedJson: JSON.stringify({ category: "Revenue - Online Sales", confidence: 0.62 }),
        confidence: 0.62,
        status: "pending",
      },
      {
        id: "rev-003",
        sourceType: "order_classification",
        sourceId: "ORD-TTS-2201",
        suggestedJson: JSON.stringify({ action: "fulfill", confidence: 0.78, reason: "Oversized item requires special packaging" }),
        confidence: 0.78,
        status: "pending",
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      { id: "tsk-001", title: "Review low-confidence ledger entries from batch-002", status: "open", priority: "high", dueDate: now, sourceType: "pipeline", sourceId: "P1" },
      { id: "tsk-002", title: "Confirm restock order for Sling Bag with supplier", status: "open", priority: "high", dueDate: new Date(now.getTime() + 86400000), sourceType: "approval", sourceId: "apr-002" },
      { id: "tsk-003", title: "Update TikTok Shop pricing after approval", status: "open", priority: "medium", dueDate: new Date(now.getTime() + 172800000), sourceType: "approval", sourceId: "apr-001" },
      { id: "tsk-004", title: "Reconcile TikTok Shop sales receipts for February", status: "open", priority: "low", dueDate: new Date(now.getTime() + 604800000), sourceType: "manual" },
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
          { id: "conf_gate", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.9 } },
          { id: "post", type: "execute", label: "Post to Ledger", config: { actionType: "post_ledger_entries" } },
          { id: "review", type: "execute", label: "Route to Review", config: { actionType: "create_review_item" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "workflow_executed" } },
        ],
        edges: [
          { source: "trigger", target: "normalize" },
          { source: "normalize", target: "classify" },
          { source: "classify", target: "conf_gate" },
          { source: "conf_gate", target: "post", label: "high" },
          { source: "conf_gate", target: "review", label: "low" },
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

  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-marketing-weekly",
      name: "Marketing Weekly Factory",
      description: "Generate weekly content plan and social media packs",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "Weekly Schedule", config: { triggerType: "weekly_schedule" } },
          { id: "fetch_signals", type: "logic", label: "Fetch Market Signals", config: { task: "fetch_market_signals" } },
          { id: "ai_strategy", type: "ai", label: "AI Content Strategy", config: { task: "draft_content_strategy" } },
          { id: "conf_gate", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.8 } },
          { id: "policy", type: "policy_check", label: "Policy Check", config: { policyKey: "marketing_budget" } },
          { id: "approval", type: "approval", label: "Owner Approval", config: { approvalType: "owner" } },
          { id: "export", type: "execute", label: "Export Content Pack", config: { actionType: "export_content_csv" } },
          { id: "review", type: "execute", label: "Route to Review", config: { actionType: "create_review_item" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "marketing_plan_generated" } },
        ],
        edges: [
          { source: "trigger", target: "fetch_signals" },
          { source: "fetch_signals", target: "ai_strategy" },
          { source: "ai_strategy", target: "conf_gate" },
          { source: "conf_gate", target: "policy", label: "high" },
          { source: "conf_gate", target: "review", label: "low" },
          { source: "policy", target: "approval" },
          { source: "approval", target: "export" },
          { source: "export", target: "audit" },
          { source: "review", target: "audit" },
        ],
      }),
    },
  });

  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-order-ops",
      name: "New Order Ops",
      description: "Process incoming orders, check stock, route actions",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "Order Received", config: { triggerType: "order_webhook" } },
          { id: "normalize", type: "logic", label: "Normalize Order", config: { task: "normalize_order" } },
          { id: "stock_check", type: "logic", label: "Check Stock", config: { task: "check_stock_availability" } },
          { id: "ai_route", type: "ai", label: "AI Route Decision", config: { task: "classify_order_action" } },
          { id: "conf_gate", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.85 } },
          { id: "fulfill", type: "execute", label: "Confirm & Fulfill", config: { actionType: "confirm_order" } },
          { id: "hold", type: "execute", label: "Hold for Review", config: { actionType: "hold_order" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "order_processed" } },
        ],
        edges: [
          { source: "trigger", target: "normalize" },
          { source: "normalize", target: "stock_check" },
          { source: "stock_check", target: "ai_route" },
          { source: "ai_route", target: "conf_gate" },
          { source: "conf_gate", target: "fulfill", label: "high" },
          { source: "conf_gate", target: "hold", label: "low" },
          { source: "fulfill", target: "audit" },
          { source: "hold", target: "audit" },
        ],
      }),
    },
  });

  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-inbox-actions",
      name: "Inbox Actions",
      description: "Classify incoming approval requests by urgency, check policy, route to owner or auto-resolve low-risk items",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "New Approval", config: { triggerType: "approval_created" } },
          { id: "classify", type: "ai", label: "Classify Urgency", config: { task: "classify_general" } },
          { id: "conf_gate", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.85 } },
          { id: "policy", type: "policy_check", label: "Policy Check", config: { policyKey: "approval_routing" } },
          { id: "auto_resolve", type: "execute", label: "Auto Resolve", config: { actionType: "auto_resolve_low_risk" } },
          { id: "route_owner", type: "approval", label: "Route to Owner", config: { approvalType: "owner" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "inbox_action_processed" } },
        ],
        edges: [
          { source: "trigger", target: "classify" },
          { source: "classify", target: "conf_gate" },
          { source: "conf_gate", target: "policy", label: "high" },
          { source: "conf_gate", target: "route_owner", label: "low" },
          { source: "policy", target: "auto_resolve", label: "pass" },
          { source: "policy", target: "route_owner", label: "blocked" },
          { source: "auto_resolve", target: "audit" },
          { source: "route_owner", target: "audit" },
        ],
      }),
    },
  });

  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-inventory-restock",
      name: "Inventory Restock",
      description: "Scan inventory levels, flag below-reorder-point SKUs, create restock approval for high-cost orders",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "Stock Monitor", config: { triggerType: "schedule" } },
          { id: "scan", type: "logic", label: "Scan Inventory", config: { task: "scan_low_stock" } },
          { id: "ai_restock", type: "ai", label: "AI Restock Plan", config: { task: "classify_general" } },
          { id: "policy", type: "policy_check", label: "Cost Policy Check", config: { policyKey: "restock_cost" } },
          { id: "approval", type: "approval", label: "Owner Approval", config: { approvalType: "owner" } },
          { id: "create_order", type: "execute", label: "Create Restock Order", config: { actionType: "create_restock_order" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "restock_initiated" } },
        ],
        edges: [
          { source: "trigger", target: "scan" },
          { source: "scan", target: "ai_restock" },
          { source: "ai_restock", target: "policy" },
          { source: "policy", target: "approval", label: "blocked" },
          { source: "policy", target: "create_order", label: "pass" },
          { source: "approval", target: "create_order" },
          { source: "create_order", target: "audit" },
        ],
      }),
    },
  });

  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-cs-assist",
      name: "CS Assist",
      description: "Classify incoming CS tickets by category and sentiment, auto-draft response for common issues, escalate complex cases",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "CS Ticket", config: { triggerType: "cs_ticket" } },
          { id: "classify", type: "ai", label: "Classify & Sentiment", config: { task: "classify_general" } },
          { id: "conf_gate", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.80 } },
          { id: "draft_response", type: "execute", label: "Draft Response", config: { actionType: "draft_cs_response" } },
          { id: "escalate", type: "approval", label: "Escalate to Human", config: { approvalType: "cs_agent" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "cs_ticket_processed" } },
        ],
        edges: [
          { source: "trigger", target: "classify" },
          { source: "classify", target: "conf_gate" },
          { source: "conf_gate", target: "draft_response", label: "high" },
          { source: "conf_gate", target: "escalate", label: "low" },
          { source: "draft_response", target: "audit" },
          { source: "escalate", target: "audit" },
        ],
      }),
    },
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
      { runId: run.id, nodeId: "conf_gate", nodeType: "confidence_gate", status: "completed", outputJson: JSON.stringify({ passed: 4, routed: 2 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "post", nodeType: "execute", status: "completed", outputJson: JSON.stringify({ posted: 4 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "review", nodeType: "execute", status: "completed", outputJson: JSON.stringify({ reviewItems: 2 }), startedAt: yesterday, completedAt: yesterday },
      { runId: run.id, nodeId: "audit", nodeType: "audit", status: "completed", outputJson: JSON.stringify({ entries: 6 }), startedAt: yesterday, completedAt: yesterday },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { eventType: "csv_import", actor: "system", targetType: "batch", targetId: "batch-001", summary: "Imported 4 transactions from CSV batch-001", evidenceJson: JSON.stringify({ evidenceId: eid("000020"), batchId: "batch-001", rowCount: 4 }), runId: "run-001", createdAt: twoDaysAgo },
      { eventType: "ledger_posted", actor: "system", targetType: "transaction", targetId: "txn-001", summary: "Posted: Pembelian kain cotton combed — COGS Raw Materials", evidenceJson: JSON.stringify({ evidenceId: eid("000001"), confidence: 0.96 }), createdAt: twoDaysAgo },
      { eventType: "review_created", actor: "system", targetType: "transaction", targetId: "txn-005", summary: "Low confidence (0.68) — routed to review queue", evidenceJson: JSON.stringify({ evidenceId: eid("000005"), confidence: 0.68 }), createdAt: now },
      { eventType: "approval_created", actor: "pipeline:P2", targetType: "approval", targetId: "apr-001", summary: "Price change approval created for Cargo Jogger on TikTok Shop", evidenceJson: JSON.stringify({ evidenceId: eid("000010"), pipeline: "P2" }), createdAt: yesterday },
      { eventType: "approval_resolved", actor: "owner", targetType: "approval", targetId: "apr-003", summary: "Approved: Stop promo Hoodie Washed Olive TikTok 25% off", beforeJson: JSON.stringify({ status: "pending" }), afterJson: JSON.stringify({ status: "approved", resolvedBy: "owner" }), evidenceJson: JSON.stringify({ evidenceId: eid("000012") }), approvalId: "apr-003", createdAt: yesterday },
      { eventType: "inventory_alert", actor: "pipeline:P5", targetType: "inventory", targetId: "NADI-SLING-BLK", summary: "Low stock alert: Sling Bag - Tactical Black at 3 units (reorder point: 12)", evidenceJson: JSON.stringify({ evidenceId: eid("000011"), available: 3, reorderPoint: 12 }), createdAt: now },
      { eventType: "policy_check", actor: "system", targetType: "product", targetId: "NADI-CARGO-GRY", summary: "Margin on TikTok Shop: 47.6% — above 20% min but flagged for high platform fee", policyJson: JSON.stringify({ minMarginPct: 0.20, actual: 0.476, result: "flagged" }), createdAt: yesterday },
    ],
  });

  await prisma.connectorConfig.createMany({
    data: [
      { type: "shopify", name: "NADI Shopify Store", status: "active", configJson: JSON.stringify({ shop: "cqcf6p-6g.myshopify.com" }) },
      { type: "csv_importer", name: "Bank CSV Importer", status: "active" },
      { type: "tokopedia", name: "Tokopedia Seller", status: "inactive" },
      { type: "tiktok_shop", name: "TikTok Shop", status: "inactive" },
    ],
  });

  console.log("Seed completed: NADI Streetwear workspace");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
