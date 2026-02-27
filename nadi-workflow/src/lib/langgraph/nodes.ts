import { interrupt } from "@langchain/langgraph";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { generateEvidenceId } from "@/lib/utils";
import { generateJSON } from "@/lib/llm-provider";
import type { WorkflowState } from "./state";

// ─── Types ────────────────────────────────────────────────────────

interface NodeConfig {
  id: string;
  type: string;
  label: string;
  config?: Record<string, unknown>;
}

// ─── Fonnte WhatsApp API ──────────────────────────────────────────

interface FonnteResult {
  success: boolean;
  detail?: string;
  id?: string;
  error?: string;
}

async function sendFonnteMessage(
  target: string,
  message: string
): Promise<FonnteResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    return { success: false, error: "FONNTE_TOKEN not configured" };
  }

  // Normalize phone: strip leading + and ensure 62 prefix for Indonesian numbers
  let phone = target.replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  }

  try {
    const body = new URLSearchParams({ target: phone, message, countryCode: "62" });
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token, // Fonnte uses raw token, NOT "Bearer"
      },
      body,
    });

    const json = await res.json();
    // Fonnte returns { status: true/false, detail: "...", id: "..." }
    if (json.status === true || json.status === "true") {
      return { success: true, detail: json.detail ?? "sent", id: json.id };
    }
    return {
      success: false,
      error: json.detail ?? json.reason ?? JSON.stringify(json),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown fetch error",
    };
  }
}

// ─── Sample Data (mirrored from run-engine.ts) ────────────────────

function deterministicIndex(runId: string, arrayLength: number): number {
  let hash = 0;
  for (let i = 0; i < runId.length; i++) {
    hash = ((hash << 5) - hash + runId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % arrayLength;
}

const SAMPLE_TRANSACTIONS = [
  { description: "Pembelian kain cotton combed 30s dari supplier Bandung", debit: 3200000, credit: 0, reference: "PO-2026-0142" },
  { description: "Penjualan Shopify Oversized Tee x5 + Snapback x3", debit: 0, credit: 1332000, reference: "SHP-2026-0227" },
  { description: "Bayar jasa sablon DTG 200 pcs", debit: 1400000, credit: 0, reference: "SUP-DTG-0127" },
  { description: "Revenue TikTok Shop settlement Cargo Jogger x8", debit: 0, credit: 2792000, reference: "TTS-STL-0227" },
  { description: "Beli packaging box custom branded 500 pcs", debit: 750000, credit: 0, reference: "SUP-PKG-0226" },
];

const SAMPLE_MARKETING_SIGNALS = [
  { topic: "New drop: Jakarta Skyline Tee launch campaign", products: "Graphic Tee Jakarta Skyline, Oversized Tee Shadow Black", overstock: null },
  { topic: "Flash sale weekend: Cargo Jogger + Track Shorts bundle", products: "Cargo Jogger Stone Grey, Track Shorts Midnight Navy", overstock: "NADI-SHORT-NVY" },
  { topic: "Ramadan modest streetwear collection promo", products: "Hoodie Washed Olive, Cargo Jogger Stone Grey, Sling Bag Tactical Black", overstock: null },
];

const SAMPLE_ORDERS = [
  { orderId: "ORD-SH-4501", items: "Oversized Tee Shadow Black x2, Snapback Cap x1", channel: "shopify", stockStatus: "available", total: 507000 },
  { orderId: "ORD-TKP-3302", items: "Cargo Jogger Stone Grey x1, Track Shorts x1", channel: "tokopedia", stockStatus: "available", total: 568000 },
  { orderId: "ORD-TTS-2201", items: "Sling Bag Tactical Black x4", channel: "tiktok_shop", stockStatus: "low (3 units)", total: 1116000 },
];

const SAMPLE_WA_EVENTS = [
  { orderId: "ORD-SH-4501", customerName: "Rizky", phone: "+6281234567890", messageType: "order_confirmation", messageText: "Halo kak Rizky! Pesanan ORD-SH-4501 (Oversized Tee Shadow Black x2, Snapback Cap x1) sudah kami terima dan sedang diproses. Estimasi pengiriman 1-2 hari kerja." },
  { orderId: "ORD-TKP-3302", customerName: "Ayu", phone: "+6287654321098", messageType: "shipping_update", messageText: "Hi kak Ayu! Pesanan ORD-TKP-3302 sudah dikirim via JNE REG. No resi: JNE-8827364510. Track di jne.co.id ya! — NADI" },
  { orderId: "ORD-TTS-2201", customerName: "Budi", phone: "+6285678901234", messageType: "delivery_confirmation", messageText: "Yeay kak Budi! Pesanan ORD-TTS-2201 (Sling Bag Tactical Black x4) sudah sampai. Semoga suka! Jangan lupa kasih review ya — NADI" },
];

// ─── Node Executor Factory ────────────────────────────────────────

export function getExecutor(
  nodeConfig: NodeConfig
): (state: WorkflowState) => Promise<Partial<WorkflowState>> {
  const { id, type, label, config } = nodeConfig;

  switch (type) {
    case "trigger":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const triggerType = (config?.triggerType as string) ?? state.triggerType;
        const idx = deterministicIndex(state.runId, 100);
        let sampleData: Record<string, unknown> = {};

        if (triggerType === "csv_import") {
          sampleData = { ...SAMPLE_TRANSACTIONS[idx % SAMPLE_TRANSACTIONS.length] };
        } else if (triggerType === "weekly_schedule") {
          sampleData = { ...SAMPLE_MARKETING_SIGNALS[idx % SAMPLE_MARKETING_SIGNALS.length] };
        } else if (triggerType === "order_webhook") {
          sampleData = { ...SAMPLE_ORDERS[idx % SAMPLE_ORDERS.length] };
        } else if (triggerType === "wa_event") {
          sampleData = { ...SAMPLE_WA_EVENTS[idx % SAMPLE_WA_EVENTS.length] };
        }

        const output = {
          label,
          triggerType,
          message: `Trigger activated: ${triggerType}`,
          timestamp: new Date().toISOString(),
          sampleData,
        };

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              triggerType,
              runId: state.runId,
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        return { data: sampleData, nodesCompleted: 1 };
      };

    case "logic":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const task = (config?.task as string) ?? "transform";

        // ── Logic Task Handler Registry ──────────────────────────────
        const logicTaskHandlers: Record<
          string,
          (st: WorkflowState) => Promise<{ data: Record<string, unknown>; message: string }>
        > = {
          normalize_deduplicate: async (st) => {
            const desc = (st.data.description as string) ?? "";
            const debit = (st.data.debit as number) ?? 0;
            const credit = (st.data.credit as number) ?? 0;
            const ref = (st.data.reference as string) ?? null;
            const existing = desc
              ? await prisma.transactionRaw.findFirst({ where: { description: desc } })
              : null;
            return {
              data: { normalized: true, isDuplicate: !!existing, description: desc, debit, credit, reference: ref },
              message: `Normalized: "${desc}" (duplicate: ${!!existing})`,
            };
          },

          fetch_unit_economics: async () => {
            const products = await prisma.product.findMany({
              include: {
                inventory: true,
                unitEconSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
              },
            });
            const economics = products.map((p) => {
              const snap = p.unitEconSnapshots[0];
              const feePct = snap?.feePct ?? 0.05;
              const feeAmount = Math.round(p.price * feePct);
              const netMargin = p.price - p.cogs - feeAmount;
              const netMarginPct = p.price > 0 ? netMargin / p.price : 0;
              return {
                sku: p.sku,
                name: p.name,
                price: p.price,
                cogs: p.cogs,
                channel: snap?.channel ?? "shopify",
                feePct,
                feeAmount,
                netMargin,
                netMarginPct,
                stock: p.inventory?.available ?? 0,
                reorderPoint: p.reorderPoint,
              };
            });
            return {
              data: { products: economics, productCount: economics.length },
              message: `Fetched unit economics for ${economics.length} products`,
            };
          },

          compute_net_margin: async (st) => {
            // Find products from upstream fetch_unit_economics output
            let products: Record<string, unknown>[] = [];
            if (Array.isArray(st.data.products)) {
              products = st.data.products as Record<string, unknown>[];
            } else {
              for (const val of Object.values(st.data)) {
                if (val && typeof val === "object" && "products" in (val as Record<string, unknown>)) {
                  products = (val as Record<string, unknown>).products as Record<string, unknown>[];
                  break;
                }
              }
            }
            const avgMarginPct =
              products.length > 0
                ? products.reduce((s, p) => s + ((p.netMarginPct as number) ?? 0), 0) / products.length
                : 0;
            const belowThreshold = products.filter((p) => ((p.netMarginPct as number) ?? 0) < 0.2);
            return {
              data: { avgMarginPct, belowThreshold, belowCount: belowThreshold.length, totalProducts: products.length },
              message: `Avg margin: ${(avgMarginPct * 100).toFixed(1)}%, ${belowThreshold.length} SKUs below 20%`,
            };
          },

          scan_low_stock: async () => {
            const products = await prisma.product.findMany({ include: { inventory: true } });
            const lowStock = products.filter((p) => p.inventory && p.inventory.available < p.reorderPoint);
            return {
              data: {
                lowStockItems: lowStock.map((p) => ({
                  sku: p.sku,
                  name: p.name,
                  stock: p.inventory!.available,
                  reorderPoint: p.reorderPoint,
                })),
                lowStockCount: lowStock.length,
              },
              message: `Found ${lowStock.length} items below reorder point`,
            };
          },

          check_stock_availability: async (st) => {
            const items = (st.data.items as string) ?? "";
            const products = await prisma.product.findMany({ include: { inventory: true } });
            const stockMap = products.map((p) => ({
              sku: p.sku,
              name: p.name,
              available: p.inventory?.available ?? 0,
            }));
            return {
              data: { stockMap, orderItems: items },
              message: `Stock checked for ${products.length} products`,
            };
          },

          normalize_order: async (st) => {
            const orderId = (st.data.orderId as string) ?? "ORD-UNKNOWN";
            const items = (st.data.items as string) ?? "";
            const channel = (st.data.channel as string) ?? "unknown";
            const total = (st.data.total as number) ?? 0;
            return {
              data: { orderId, items, channel, total, normalizedAt: new Date().toISOString() },
              message: `Order ${orderId} normalized`,
            };
          },

          build_wa_payload: async (st) => {
            const phone = (st.data.phone as string) ?? "+628xxx";
            const customerName = (st.data.customerName as string) ?? "Customer";
            const messageType = (st.data.messageType as string) ?? "notification";
            const messageText = (st.data.messageText as string) ?? "";
            const orderId = (st.data.orderId as string) ?? "";
            return {
              data: { phone, customerName, messageType, messageText, orderId, formattedAt: new Date().toISOString() },
              message: `WA payload built for ${customerName}`,
            };
          },

          fetch_market_signals: async (st) => {
            const products = await prisma.product.findMany({ include: { inventory: true } });
            const overstocked = products.filter(
              (p) => p.inventory && p.inventory.available > p.reorderPoint * 3
            );
            return {
              data: {
                topic: (st.data.topic as string) ?? "weekly promo",
                products: (st.data.products as string) ?? "",
                overstockedSkus: overstocked.map((p) => p.sku),
                signalCount: overstocked.length,
              },
              message: `Market signals: ${overstocked.length} overstocked SKUs`,
            };
          },
        };

        const handler = logicTaskHandlers[task];
        let resultData: Record<string, unknown>;
        let resultMessage: string;

        if (handler) {
          const result = await handler(state);
          resultData = result.data;
          resultMessage = result.message;
        } else {
          resultData = { inputKeys: Object.keys(state.data) };
          resultMessage = `${label} completed — pass-through (no handler for task "${task}")`;
        }

        const output = { label, task, message: resultMessage, ...resultData };

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              task,
              handlerFound: !!handler,
              processedAt: new Date().toISOString(),
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        return {
          data: { [`${id}_output`]: output, ...resultData },
          nodesCompleted: 1,
        };
      };

    case "ai":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const task = (config?.task as string) ?? "classify";

        const llmResult = await generateJSON({
          task,
          prompt: "",
          context: { ...state.data, templateName: state.templateName, nodeLabel: label },
        });

        const output = {
          label,
          task,
          message: `AI ${task} completed with confidence ${(llmResult.confidence * 100).toFixed(1)}% [${llmResult.provider}/${llmResult.model}]`,
          data: llmResult.data,
          confidence: llmResult.confidence,
          rationale: llmResult.rationale,
          provider: llmResult.provider,
          model: llmResult.model,
          latencyMs: llmResult.latencyMs,
        };

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: llmResult.evidenceId,
              provider: llmResult.provider,
              model: llmResult.model,
              task,
              confidence: llmResult.confidence,
              promptVersion: llmResult.promptVersion,
              latencyMs: llmResult.latencyMs,
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        return {
          confidence: llmResult.confidence,
          data: { [`${id}_output`]: output },
          nodesCompleted: 1,
        };
      };

    case "confidence_gate":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const threshold = (config?.threshold as number) ?? 0.9;
        const confidence = state.confidence ?? 0.85;
        const pass = confidence >= threshold;
        const branchPath = pass ? "high" : "low";

        const output = pass
          ? {
              label,
              message: `Confidence ${(confidence * 100).toFixed(1)}% >= threshold ${(threshold * 100).toFixed(0)}% — passed`,
              confidence,
              threshold,
              result: "pass",
            }
          : {
              label,
              message: `Confidence ${(confidence * 100).toFixed(1)}% < threshold ${(threshold * 100).toFixed(0)}% — routed to review`,
              confidence,
              threshold,
              result: "needs_review",
            };

        const updates: Partial<WorkflowState> = {
          branchPath,
          data: { [`${id}_output`]: output },
          nodesCompleted: 1,
        };

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              confidence,
              threshold,
              result: branchPath,
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        if (!pass) {
          try {
            const item = await prisma.reviewItem.create({
              data: {
                sourceType: "workflow",
                sourceId: state.runId,
                suggestedJson: JSON.stringify({ confidence, threshold, action: "manual_review_required" }),
                confidence,
                status: "pending",
              },
            });
            updates.sideEffects = [{ type: "review_item", id: item.id }];
          } catch (err) {
            console.error("review_item side effect failed:", err);
          }
        }

        return updates;
      };

    case "policy_check":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();

        const policy = await prisma.policy.findFirst({
          where: { isActive: true },
          orderBy: { version: "desc" },
        });

        if (!policy) {
          const output = {
            label,
            message: "No active policy found — defaulting to pass",
            result: "pass",
          };

          await prisma.nodeRun.create({
            data: {
              runId: state.runId,
              nodeId: id,
              nodeType: type,
              status: "completed",
              inputJson: JSON.stringify(state.data),
              outputJson: JSON.stringify(output),
              evidenceJson: JSON.stringify({
                evidenceId: generateEvidenceId(),
                result: "pass",
                reason: "no_active_policy",
              }),
              startedAt,
              completedAt: new Date(),
            },
          });

          return {
            branchPath: "pass",
            policyResult: "pass",
            data: { [`${id}_output`]: output },
            nodesCompleted: 1,
          };
        }

        const policyKey = (config?.policyKey as string) ?? "general";

        // Resolve real margin from upstream state.data (compute_net_margin or fetch_unit_economics)
        let computedMargin = -1;
        if (typeof state.data.avgMarginPct === "number") {
          computedMargin = state.data.avgMarginPct as number;
        } else {
          for (const val of Object.values(state.data)) {
            if (val && typeof val === "object" && "avgMarginPct" in (val as Record<string, unknown>)) {
              computedMargin = (val as Record<string, unknown>).avgMarginPct as number;
              break;
            }
          }
        }

        if (computedMargin < 0) {
          const products = await prisma.product.findMany();
          if (products.length > 0) {
            const margins = products.map((p) => {
              const fee = Math.round(p.price * 0.05);
              return p.price > 0 ? (p.price - p.cogs - fee) / p.price : 0;
            });
            computedMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
          } else {
            computedMargin = 0;
          }
        }

        const margin = computedMargin;
        const pass = margin >= policy.minMarginPct;

        const updates: Partial<WorkflowState> = {
          branchPath: pass ? "pass" : "blocked",
          policyResult: pass ? "pass" : "blocked",
          data: {},
          nodesCompleted: 1,
        };

        if (!pass) {
          const output = {
            label,
            message: `Policy check BLOCKED: margin ${(margin * 100).toFixed(1)}% < min ${(policy.minMarginPct * 100).toFixed(0)}%`,
            result: "blocked",
            policyVersion: policy.version,
            computedMargin: margin,
          };

          await prisma.nodeRun.create({
            data: {
              runId: state.runId,
              nodeId: id,
              nodeType: type,
              status: "completed",
              inputJson: JSON.stringify(state.data),
              outputJson: JSON.stringify(output),
              evidenceJson: JSON.stringify({
                evidenceId: generateEvidenceId(),
                policyKey,
                policyVersion: policy.version,
                result: "blocked",
                margin,
                minMargin: policy.minMarginPct,
              }),
              startedAt,
              completedAt: new Date(),
            },
          });

          try {
            const approval = await prisma.approval.create({
              data: {
                actionType: `workflow_${policyKey}`,
                targetType: "workflow_run",
                targetId: state.runId,
                riskLevel: "medium",
                status: "pending",
                title: `Policy violation in ${state.templateName}`,
                description: `Margin ${(margin * 100).toFixed(1)}% below minimum ${(policy.minMarginPct * 100).toFixed(0)}%`,
                evidenceJson: JSON.stringify({
                  evidenceId: generateEvidenceId(),
                  policyVersion: policy.version,
                  runId: state.runId,
                }),
              },
            });
            updates.sideEffects = [{ type: "approval", id: approval.id }];
          } catch (err) {
            console.error("approval side effect failed:", err);
          }

          updates.data = { [`${id}_output`]: output };
        } else {
          const output = {
            label,
            message: `Policy check PASSED: margin ${(margin * 100).toFixed(1)}% >= min ${(policy.minMarginPct * 100).toFixed(0)}%`,
            result: "pass",
            policyVersion: policy.version,
            computedMargin: margin,
          };

          await prisma.nodeRun.create({
            data: {
              runId: state.runId,
              nodeId: id,
              nodeType: type,
              status: "completed",
              inputJson: JSON.stringify(state.data),
              outputJson: JSON.stringify(output),
              evidenceJson: JSON.stringify({
                evidenceId: generateEvidenceId(),
                policyKey,
                policyVersion: policy.version,
                result: "pass",
                margin,
              }),
              startedAt,
              completedAt: new Date(),
            },
          });

          updates.data = { [`${id}_output`]: output };
        }

        return updates;
      };

    case "approval":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();

        const approval = await prisma.approval.create({
          data: {
            actionType: (config?.actionType as string) ?? "workflow_approval",
            targetType: "workflow_run",
            targetId: state.runId,
            riskLevel: (config?.riskLevel as string) ?? "medium",
            status: "pending",
            title: (config?.title as string) ?? `Approval required: ${label}`,
            description: (config?.description as string) ?? `Manual approval required for workflow run ${state.runId}`,
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              runId: state.runId,
              nodeId: id,
            }),
          },
        });

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "awaiting_approval",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify({ approvalId: approval.id }),
            startedAt,
          },
        });

        // Update run status to awaiting_approval before interrupting
        await prisma.workflowRun.update({
          where: { id: state.runId },
          data: { status: "awaiting_approval" },
        });

        const decision = interrupt({
          approvalId: approval.id,
          title: approval.title,
          riskLevel: approval.riskLevel,
        }) as { approved: boolean };

        const resolvedStatus = decision.approved ? "approved" : "rejected";

        await prisma.approval.update({
          where: { id: approval.id },
          data: {
            status: resolvedStatus,
            resolvedBy: "owner",
            resolvedAt: new Date(),
          },
        });

        await prisma.nodeRun.updateMany({
          where: { runId: state.runId, nodeId: id },
          data: { status: "completed", completedAt: new Date() },
        });

        return {
          approvalInterrupt: undefined,
          sideEffects: [{ type: "approval", id: approval.id }],
          nodesCompleted: 1,
        };
      };

    case "execute":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const actionType = (config?.actionType as string) ?? "generic_action";
        let output: Record<string, unknown> = {};
        const updates: Partial<WorkflowState> = { data: {}, nodesCompleted: 1 };

        switch (actionType) {
          case "post_ledger_entries": {
            const desc = (state.data.description as string) ?? "Imported transaction";
            const debit = (state.data.debit as number) ?? 0;
            const credit = (state.data.credit as number) ?? 0;
            const ref = (state.data.reference as string) ?? null;
            const batchKey = `WF-${state.runId}`;
            const existing = await prisma.transactionRaw.findFirst({
              where: { importBatch: batchKey, description: desc },
            });
            if (existing) {
              output = { label, actionType, message: `Skipped duplicate: ${desc}`, skipped: true };
              break;
            }
            const txn = await prisma.transactionRaw.create({
              data: {
                date: new Date(),
                description: desc,
                debit, credit,
                reference: ref,
                source: "workflow",
                importBatch: batchKey,
              },
            });
            const evId = generateEvidenceId();
            const aiConf = state.confidence ?? 0.92;
            const descLower = desc.toLowerCase();
            const category = descLower.includes("penjualan") || descLower.includes("revenue") || descLower.includes("shopify") || descLower.includes("tokopedia") ? "Revenue - Online Sales" : descLower.includes("beli") || descLower.includes("bahan") || descLower.includes("kain") ? "COGS - Raw Materials" : descLower.includes("sablon") || descLower.includes("jahit") ? "COGS - Production Services" : "Other";
            const entry = await prisma.ledgerEntry.create({
              data: {
                transactionId: txn.id,
                category,
                confidence: aiConf,
                evidenceId: evId,
                status: "posted",
                aiRationale: `Auto-posted by Finance Close workflow (confidence ${(aiConf * 100).toFixed(1)}%)`,
              },
            });
            output = { label, actionType, message: `Posted ledger entry: ${desc} (${debit > 0 ? `debit Rp${debit.toLocaleString()}` : `credit Rp${credit.toLocaleString()}`})`, transactionId: txn.id, ledgerEntryId: entry.id, evidenceId: evId };
            updates.sideEffects = [{ type: "ledger_entry", id: entry.id }];
            break;
          }

          case "apply_price_change": {
            const products = await prisma.product.findMany({ take: 7 });
            if (products.length > 0) {
              const idx = deterministicIndex(state.runId, products.length);
              const product = products[idx];
              const oldPrice = product.price;
              const newPrice = Math.round(oldPrice * 1.12);
              await prisma.product.update({ where: { id: product.id }, data: { price: newPrice } });
              output = { label, actionType, message: `Price updated: ${product.name} Rp${oldPrice.toLocaleString()} → Rp${newPrice.toLocaleString()} (+12%)`, sku: product.sku, productName: product.name, oldPrice, newPrice, changePct: 12 };
              updates.sideEffects = [{ type: "price_update", id: product.id }];
            } else {
              output = { label, actionType, message: "No products found to update" };
            }
            break;
          }

          case "draft_price_change": {
            const products = await prisma.product.findMany({ take: 7 });
            if (products.length > 0) {
              const idx = deterministicIndex(state.runId, products.length);
              const product = products[idx];
              const proposedPrice = Math.round(product.price * 1.12);
              output = { label, actionType, message: `Drafted price change: ${product.name} Rp${product.price.toLocaleString()} → Rp${proposedPrice.toLocaleString()}`, sku: product.sku, currentPrice: product.price, proposedPrice };
            } else {
              output = { label, actionType, message: "No products found for draft" };
            }
            break;
          }

          case "confirm_order": {
            const orderId = (state.data.orderId as string) ?? "ORD-UNKNOWN";
            const items = (state.data.items as string) ?? "Unknown items";
            const channel = (state.data.channel as string) ?? "unknown";
            const total = (state.data.total as number) ?? 0;
            const task = await prisma.task.create({
              data: {
                title: `Fulfill order ${orderId}`,
                status: "open",
                priority: "high",
                sourceType: "workflow",
                sourceId: state.runId,
                sourceJson: JSON.stringify({ orderId, items, channel, total }),
              },
            });
            output = { label, actionType, message: `Order confirmed: ${orderId} — fulfillment task created`, orderId, taskId: task.id, items, channel };
            updates.sideEffects = [{ type: "task", id: task.id }];
            break;
          }

          case "hold_order": {
            const orderId = (state.data.orderId as string) ?? "ORD-UNKNOWN";
            const items = (state.data.items as string) ?? "Unknown items";
            const task = await prisma.task.create({
              data: {
                title: `Review held order ${orderId}`,
                status: "open",
                priority: "high",
                sourceType: "workflow",
                sourceId: state.runId,
                sourceJson: JSON.stringify({ orderId, items, reason: "low_confidence" }),
              },
            });
            const reviewItem = await prisma.reviewItem.create({
              data: {
                sourceType: "order",
                sourceId: state.runId,
                suggestedJson: JSON.stringify({ orderId, items, action: "hold_for_review" }),
                confidence: state.confidence ?? 0.5,
                status: "pending",
              },
            });
            output = { label, actionType, message: `Order ${orderId} held for review`, orderId, taskId: task.id, reviewItemId: reviewItem.id };
            updates.sideEffects = [{ type: "task", id: task.id }, { type: "review_item", id: reviewItem.id }];
            break;
          }

          case "create_review_item": {
            const reviewItem = await prisma.reviewItem.create({
              data: {
                sourceType: "workflow",
                sourceId: state.runId,
                suggestedJson: JSON.stringify({ templateName: state.templateName, confidence: state.confidence, data: state.data }),
                confidence: state.confidence ?? 0.5,
                status: "pending",
              },
            });
            output = { label, actionType, message: `Review item created (confidence ${((state.confidence ?? 0.5) * 100).toFixed(1)}%)`, reviewItemId: reviewItem.id };
            updates.sideEffects = [{ type: "review_item", id: reviewItem.id }];
            break;
          }

          case "create_restock_order": {
            const products = await prisma.product.findMany({ include: { inventory: true }, take: 7 });
            const lowStock = products.filter(p => p.inventory && p.inventory.available < p.reorderPoint);
            const target = lowStock.length > 0 ? lowStock[0] : products[deterministicIndex(state.runId, products.length)];
            const qty = target.reorderPoint * 2;
            const task = await prisma.task.create({
              data: {
                title: `Restock: ${target.name} (${target.sku}) — ${qty} units`,
                status: "open",
                priority: "high",
                sourceType: "workflow",
                sourceId: state.runId,
                sourceJson: JSON.stringify({ sku: target.sku, name: target.name, currentStock: target.inventory?.available ?? 0, reorderPoint: target.reorderPoint, suggestedQty: qty, estimatedCost: target.cogs * qty }),
              },
            });
            output = { label, actionType, message: `Restock order: ${target.name} — ${qty} units (est. Rp${(target.cogs * qty).toLocaleString()})`, sku: target.sku, taskId: task.id };
            updates.sideEffects = [{ type: "task", id: task.id }];
            break;
          }

          case "draft_cs_response": {
            const task = await prisma.task.create({
              data: {
                title: `CS Draft Response — ${state.templateName}`,
                status: "open",
                priority: "medium",
                sourceType: "workflow",
                sourceId: state.runId,
                sourceJson: JSON.stringify({ draftResponse: "Halo kak, terima kasih sudah menghubungi NADI. Tim kami sedang memproses permintaan Anda dan akan segera memberikan update.", category: "general_inquiry", sentiment: "neutral" }),
              },
            });
            output = { label, actionType, message: `CS response draft created — ready for review`, taskId: task.id };
            updates.sideEffects = [{ type: "task", id: task.id }];
            break;
          }

          case "auto_resolve_low_risk": {
            const task = await prisma.task.create({
              data: {
                title: `Auto-resolved: low-risk action (${state.templateName})`,
                status: "completed",
                priority: "low",
                sourceType: "workflow",
                sourceId: state.runId,
                sourceJson: JSON.stringify({ resolution: "auto_resolved", reason: "Low risk, within policy bounds", confidence: state.confidence }),
              },
            });
            output = { label, actionType, message: `Low-risk action auto-resolved`, taskId: task.id };
            updates.sideEffects = [{ type: "task", id: task.id }];
            break;
          }

          case "export_content_csv": {
            const task = await prisma.task.create({
              data: {
                title: `Export content pack: Weekly ${new Date().toISOString().slice(0, 10)}`,
                status: "open",
                priority: "medium",
                sourceType: "workflow",
                sourceId: state.runId,
                sourceJson: JSON.stringify({ exportType: "content_pack", format: "csv", templateName: state.templateName }),
              },
            });
            output = { label, actionType, message: `Content pack export task created`, taskId: task.id };
            updates.sideEffects = [{ type: "task", id: task.id }];
            break;
          }

          case "send_wa_message": {
            const customerName = (state.data.customerName as string) ?? "Customer";
            const orderId = (state.data.orderId as string) ?? "ORD-UNKNOWN";
            const messageType = (state.data.messageType as string) ?? "order_confirmation";
            const messageText = (state.data.messageText as string) ?? `Halo kak! Pesanan ${orderId} sedang diproses oleh NADI.`;
            const phone = (state.data.phone as string) || process.env.FONNTE_DEFAULT_PHONE || "082199342231";

            const fonnteResult = await sendFonnteMessage(phone, messageText);

            const task = await prisma.task.create({
              data: {
                title: `WA ${fonnteResult.success ? "Sent" : "Failed"}: ${messageType} → ${customerName}`,
                status: fonnteResult.success ? "completed" : "open",
                priority: fonnteResult.success ? "low" : "high",
                sourceType: "wa_notification",
                sourceId: state.runId,
                sourceJson: JSON.stringify({
                  phone, customerName, orderId, messageType, messageText,
                  sentAt: new Date().toISOString(),
                  channel: "whatsapp",
                  fonnte: {
                    success: fonnteResult.success,
                    detail: fonnteResult.detail,
                    messageId: fonnteResult.id,
                    error: fonnteResult.error,
                  },
                }),
              },
            });

            const statusMsg = fonnteResult.success
              ? `WhatsApp sent via Fonnte: ${messageType} to ${customerName} (${phone})`
              : `WhatsApp send failed: ${fonnteResult.error} — task created for retry`;

            output = {
              label, actionType, message: statusMsg,
              taskId: task.id, messageType, phone,
              fonnteSent: fonnteResult.success,
              fonnteMessageId: fonnteResult.id,
              fonnteError: fonnteResult.error,
            };
            updates.sideEffects = [{ type: "wa_notification", id: task.id }];
            break;
          }

          case "queue_wa_manual": {
            const customerName = (state.data.customerName as string) ?? "Customer";
            const orderId = (state.data.orderId as string) ?? "ORD-UNKNOWN";
            const messageType = (state.data.messageType as string) ?? "order_confirmation";
            const messageText = (state.data.messageText as string) ?? `Halo kak! Pesanan ${orderId} sedang diproses oleh NADI.`;
            const phone = (state.data.phone as string) || process.env.FONNTE_DEFAULT_PHONE || "082199342231";
            const task = await prisma.task.create({
              data: {
                title: `WA Queued: manual send → ${customerName}`,
                status: "open",
                priority: "medium",
                sourceType: "wa_notification",
                sourceId: state.runId,
                sourceJson: JSON.stringify({
                  customerName, orderId, messageType, messageText, phone,
                  reason: "low_confidence",
                  requiresManualReview: true,
                  fonnte: {
                    ready: true,
                    target: phone.replace(/[^0-9]/g, "").replace(/^0/, "62"),
                    message: messageText,
                  },
                }),
              },
            });
            output = { label, actionType, message: `WhatsApp queued for manual review: ${customerName} (${phone})`, taskId: task.id, phone };
            updates.sideEffects = [{ type: "task", id: task.id }];
            break;
          }

          default: {
            output = { label, actionType, message: `Action executed: ${actionType}`, affectedRecords: 1 };
          }
        }

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              actionType,
              runId: state.runId,
              executedAt: new Date().toISOString(),
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        updates.data = { [`${id}_output`]: output };
        return updates;
      };

    case "audit":
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const eventType = (config?.eventType as string) ?? "workflow_executed";

        await writeAudit({
          eventType,
          actor: "system",
          targetType: "workflow_run",
          targetId: state.runId,
          summary: `Workflow "${state.templateName}" node "${label}" audit entry`,
          runId: state.runId,
          evidenceJson: {
            nodeId: id,
            templateId: state.templateId,
          },
        });

        const output = {
          label,
          message: `Audit entry written: ${eventType}`,
          eventType,
        };

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              eventType,
              runId: state.runId,
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        return {
          data: { [`${id}_output`]: output },
          nodesCompleted: 1,
        };
      };

    default:
      return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
        const startedAt = new Date();
        const output = {
          label,
          message: `Unknown node type "${type}" — skipped`,
        };

        await prisma.nodeRun.create({
          data: {
            runId: state.runId,
            nodeId: id,
            nodeType: type,
            status: "completed",
            inputJson: JSON.stringify(state.data),
            outputJson: JSON.stringify(output),
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              skipped: true,
              nodeType: type,
            }),
            startedAt,
            completedAt: new Date(),
          },
        });

        return {
          data: { [`${id}_output`]: output },
          nodesCompleted: 1,
        };
      };
  }
}
