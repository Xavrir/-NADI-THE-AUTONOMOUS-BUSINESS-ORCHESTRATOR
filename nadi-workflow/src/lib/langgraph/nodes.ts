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

        const output = {
          label,
          task,
          message: `${label} completed — deterministic transform applied`,
          inputKeys: Object.keys(state.data),
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
              task,
              processedAt: new Date().toISOString(),
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
        const simulatedMargin = 0.32;
        const pass = simulatedMargin >= policy.minMarginPct;

        const updates: Partial<WorkflowState> = {
          branchPath: pass ? "pass" : "blocked",
          policyResult: pass ? "pass" : "blocked",
          data: {},
          nodesCompleted: 1,
        };

        if (!pass) {
          const output = {
            label,
            message: `Policy check BLOCKED: margin ${(simulatedMargin * 100).toFixed(1)}% < min ${(policy.minMarginPct * 100).toFixed(0)}%`,
            result: "blocked",
            policyVersion: policy.version,
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
                margin: simulatedMargin,
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
                description: `Margin ${(simulatedMargin * 100).toFixed(1)}% below minimum ${(policy.minMarginPct * 100).toFixed(0)}%`,
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
            message: `Policy check PASSED: margin ${(simulatedMargin * 100).toFixed(1)}% >= min ${(policy.minMarginPct * 100).toFixed(0)}%`,
            result: "pass",
            policyVersion: policy.version,
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

        const output = {
          label,
          actionType,
          message: `Action executed: ${actionType}`,
          affectedRecords: 1,
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
              actionType,
              runId: state.runId,
              executedAt: new Date().toISOString(),
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
