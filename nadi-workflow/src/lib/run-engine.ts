/**
 * NADI Workflow Run Engine
 *
 * Server-side simulator that walks a workflow template's nodes in topological
 * order and creates NodeRun records with semantic behavior per node type.
 *
 * Per PLAN.md:
 * - Deterministic traversal (no parallelism in MVP)
 * - Side effects only in ExecuteAction nodes
 * - Every node writes evidence into NodeRun.evidenceJson
 * - ConfidenceGate routes low-confidence to ReviewItem
 * - PolicyCheck blocks rule-breaking actions and creates Approval
 */

import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { generateEvidenceId } from "@/lib/utils";
import { generateJSON } from "@/lib/llm-provider";

// ─── Types ────────────────────────────────────────────────────────

interface NodeConfig {
  id: string;
  type: string;
  label: string;
  config?: Record<string, unknown>;
}

interface EdgeConfig {
  source: string;
  target: string;
  label?: string;
  when?: string;
}

interface TemplateConfig {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  entryNodeId?: string;
}

interface RunContext {
  runId: string;
  templateId: string;
  templateName: string;
  triggerType: string;
  data: Record<string, unknown>;
  confidence?: number;
  policyResult?: "pass" | "blocked";
  branchPath?: string;
}

type NodeResult = {
  status: "completed" | "failed" | "needs_review" | "awaiting_approval";
  output: Record<string, unknown>;
  evidence: Record<string, unknown>;
  nextEdgeFilter?: string; // which "when" edges to follow
  sideEffects?: Array<{
    type: "review_item" | "approval" | "audit" | "task";
    data: Record<string, unknown>;
  }>;
};

// ─── Topological Sort ─────────────────────────────────────────────

function topologicalSort(nodes: NodeConfig[], edges: EdgeConfig[], entryId?: string): string[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's algorithm, preferring entryId first
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      if (nodeId === entryId) {
        queue.unshift(nodeId);
      } else {
        queue.push(nodeId);
      }
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}

// ─── Sample Data for Demo ─────────────────────────────────────────

const SAMPLE_TRANSACTIONS = [
  { description: "Pembelian biji kopi Arabica Gayo 50kg", debit: 4250000, credit: 0, reference: "PO-2026-0142" },
  { description: "Penjualan latte oat milk x12 via Grab", debit: 0, credit: 540000, reference: "GRB-26022701" },
  { description: "Bayar listrik toko Februari", debit: 875000, credit: 0, reference: "PLN-FEB-2026" },
  { description: "Revenue Shopify order #SH-4421 espresso beans 1kg x5", debit: 0, credit: 1125000, reference: "SH-4421" },
  { description: "Gaji part-time barista Minggu ke-4", debit: 1200000, credit: 0, reference: "HR-W4-FEB26" },
];

// ─── Node Executors ───────────────────────────────────────────────

async function executeTrigger(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const triggerType = (node.config?.triggerType as string) ?? ctx.triggerType;

  // Inject sample transaction for demo so downstream AI nodes have real context
  if (triggerType === "csv_import") {
    const sample = SAMPLE_TRANSACTIONS[Math.floor(Math.random() * SAMPLE_TRANSACTIONS.length)];
    ctx.data = {
      ...ctx.data,
      description: sample.description,
      debit: sample.debit,
      credit: sample.credit,
      reference: sample.reference,
    };
  }

  return {
    status: "completed",
    output: {
      label: node.label,
      triggerType,
      message: `Trigger activated: ${triggerType}`,
      timestamp: new Date().toISOString(),
      sampleData: triggerType === "csv_import" ? ctx.data : undefined,
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      triggerType,
      runId: ctx.runId,
    },
  };
}

async function executeLogic(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const task = (node.config?.task as string) ?? "transform";
  return {
    status: "completed",
    output: {
      label: node.label,
      task,
      message: `${node.label} completed — deterministic transform applied`,
      inputKeys: Object.keys(ctx.data),
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      task,
      processedAt: new Date().toISOString(),
    },
  };
}

async function executeAIDecision(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const task = (node.config?.task as string) ?? "classify";

  const llmResult = await generateJSON({
    task,
    prompt: "",
    context: { ...ctx.data, templateName: ctx.templateName, nodeLabel: node.label },
  });

  ctx.confidence = llmResult.confidence;

  return {
    status: "completed",
    output: {
      label: node.label,
      task,
      message: `AI ${task} completed with confidence ${(llmResult.confidence * 100).toFixed(1)}% [${llmResult.provider}/${llmResult.model}]`,
      data: llmResult.data,
      confidence: llmResult.confidence,
      rationale: llmResult.rationale,
      provider: llmResult.provider,
      model: llmResult.model,
      latencyMs: llmResult.latencyMs,
    },
    evidence: {
      evidenceId: llmResult.evidenceId,
      provider: llmResult.provider,
      model: llmResult.model,
      task,
      confidence: llmResult.confidence,
      promptVersion: llmResult.promptVersion,
      latencyMs: llmResult.latencyMs,
    },
  };
}

async function executeConfidenceGate(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const threshold = (node.config?.threshold as number) ?? 0.9;
  const confidence = ctx.confidence ?? 0.85;
  const pass = confidence >= threshold;

  if (!pass) {
    // Create ReviewItem for low confidence
    return {
      status: "completed",
      output: {
        label: node.label,
        message: `Confidence ${(confidence * 100).toFixed(1)}% < threshold ${(threshold * 100).toFixed(0)}% — routed to review`,
        confidence,
        threshold,
        result: "needs_review",
      },
      evidence: {
        evidenceId: generateEvidenceId(),
        confidence,
        threshold,
        result: "needs_review",
      },
      nextEdgeFilter: "low",
      sideEffects: [
        {
          type: "review_item",
          data: {
            sourceType: "workflow",
            sourceId: ctx.runId,
            suggestedJson: JSON.stringify({
              confidence,
              threshold,
              action: "manual_review_required",
            }),
            confidence,
            status: "pending",
          },
        },
      ],
    };
  }

  return {
    status: "completed",
    output: {
      label: node.label,
      message: `Confidence ${(confidence * 100).toFixed(1)}% >= threshold ${(threshold * 100).toFixed(0)}% — passed`,
      confidence,
      threshold,
      result: "pass",
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      confidence,
      threshold,
      result: "pass",
    },
    nextEdgeFilter: "high",
  };
}

async function executePolicyCheck(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  // Load active policy
  const policy = await prisma.policy.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  if (!policy) {
    return {
      status: "completed",
      output: {
        label: node.label,
        message: "No active policy found — defaulting to pass",
        result: "pass",
      },
      evidence: {
        evidenceId: generateEvidenceId(),
        result: "pass",
        reason: "no_active_policy",
      },
      nextEdgeFilter: "pass",
    };
  }

  // Deterministic check: simulate margin check
  const policyKey = (node.config?.policyKey as string) ?? "general";
  const simulatedMargin = 0.32; // deterministic stub
  const pass = simulatedMargin >= policy.minMarginPct;

  if (!pass) {
    return {
      status: "completed",
      output: {
        label: node.label,
        message: `Policy check BLOCKED: margin ${(simulatedMargin * 100).toFixed(1)}% < min ${(policy.minMarginPct * 100).toFixed(0)}%`,
        result: "blocked",
        policyVersion: policy.version,
      },
      evidence: {
        evidenceId: generateEvidenceId(),
        policyKey,
        policyVersion: policy.version,
        result: "blocked",
        margin: simulatedMargin,
        minMargin: policy.minMarginPct,
      },
      nextEdgeFilter: "blocked",
      sideEffects: [
        {
          type: "approval",
          data: {
            actionType: `workflow_${policyKey}`,
            targetType: "workflow_run",
            targetId: ctx.runId,
            riskLevel: "medium",
            status: "pending",
            title: `Policy violation in ${ctx.templateName}`,
            description: `Margin ${(simulatedMargin * 100).toFixed(1)}% below minimum ${(policy.minMarginPct * 100).toFixed(0)}%`,
            evidenceJson: JSON.stringify({
              evidenceId: generateEvidenceId(),
              policyVersion: policy.version,
              runId: ctx.runId,
            }),
          },
        },
      ],
    };
  }

  ctx.policyResult = "pass";
  return {
    status: "completed",
    output: {
      label: node.label,
      message: `Policy check PASSED: margin ${(simulatedMargin * 100).toFixed(1)}% >= min ${(policy.minMarginPct * 100).toFixed(0)}%`,
      result: "pass",
      policyVersion: policy.version,
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      policyKey,
      policyVersion: policy.version,
      result: "pass",
    },
    nextEdgeFilter: "pass",
  };
}

async function executeApprovalNode(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  // Approval node creates a wait state — in MVP we just record it and continue
  return {
    status: "completed",
    output: {
      label: node.label,
      message: "Approval checkpoint recorded — workflow continues (MVP: no blocking wait)",
      approvalRequired: true,
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      nodeId: node.id,
      runId: ctx.runId,
    },
  };
}

async function executeAction(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const actionType = (node.config?.actionType as string) ?? "generic_action";
  return {
    status: "completed",
    output: {
      label: node.label,
      actionType,
      message: `Action executed: ${actionType}`,
      affectedRecords: 1,
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      actionType,
      runId: ctx.runId,
      executedAt: new Date().toISOString(),
    },
  };
}

async function executeWriteAudit(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const eventType = (node.config?.eventType as string) ?? "workflow_executed";

  await writeAudit({
    eventType,
    actor: "system",
    targetType: "workflow_run",
    targetId: ctx.runId,
    summary: `Workflow "${ctx.templateName}" node "${node.label}" audit entry`,
    runId: ctx.runId,
    evidenceJson: {
      nodeId: node.id,
      templateId: ctx.templateId,
    },
  });

  return {
    status: "completed",
    output: {
      label: node.label,
      message: `Audit entry written: ${eventType}`,
      eventType,
    },
    evidence: {
      evidenceId: generateEvidenceId(),
      eventType,
      runId: ctx.runId,
    },
  };
}

// ─── Node Executor Router ─────────────────────────────────────────

const executors: Record<string, (node: NodeConfig, ctx: RunContext) => Promise<NodeResult>> = {
  trigger: executeTrigger,
  logic: executeLogic,
  ai: executeAIDecision,
  confidence_gate: executeConfidenceGate,
  policy_check: executePolicyCheck,
  approval: executeApprovalNode,
  execute: executeAction,
  audit: executeWriteAudit,
};

async function executeNode(node: NodeConfig, ctx: RunContext): Promise<NodeResult> {
  const executor = executors[node.type];
  if (!executor) {
    return {
      status: "completed",
      output: {
        label: node.label,
        message: `Unknown node type "${node.type}" — skipped`,
      },
      evidence: {
        evidenceId: generateEvidenceId(),
        skipped: true,
        nodeType: node.type,
      },
    };
  }
  return executor(node, ctx);
}

// ─── Main Run Engine ──────────────────────────────────────────────

export async function runWorkflow(
  templateId: string,
  triggerType: string = "manual"
): Promise<{
  runId: string;
  status: string;
  nodesCompleted: number;
  nodesFailed: number;
  sideEffects: Array<{ type: string; id?: string }>;
}> {
  // 1. Load template
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const config: TemplateConfig = JSON.parse(template.configJson);

  if (!config.nodes.length) {
    throw new Error("Template has no nodes");
  }

  // 2. Create run record
  const now = new Date();
  const run = await prisma.workflowRun.create({
    data: {
      templateId,
      triggerType,
      status: "running",
      startedAt: now,
    },
  });

  // 3. Build context
  const ctx: RunContext = {
    runId: run.id,
    templateId,
    templateName: template.name,
    triggerType,
    data: {},
  };

  // 4. Topological traversal
  const sortedNodeIds = topologicalSort(config.nodes, config.edges, config.entryNodeId);
  const nodeMap = new Map(config.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map<string, EdgeConfig[]>();
  for (const edge of config.edges) {
    const list = edgeMap.get(edge.source) ?? [];
    list.push(edge);
    edgeMap.set(edge.source, list);
  }

  // Track which nodes to actually visit (branching may skip some)
  const visitedNodes = new Set<string>();
  const reachableNodes = new Set(sortedNodeIds);

  let nodesCompleted = 0;
  let nodesFailed = 0;
  const sideEffects: Array<{ type: string; id?: string }> = [];
  let runStatus = "running";

  // 5. Execute nodes in topological order
  for (const nodeId of sortedNodeIds) {
    if (!reachableNodes.has(nodeId)) continue;

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    visitedNodes.add(nodeId);

    const nodeStart = new Date();

    try {
      const result = await executeNode(node, ctx);

      const nodeEnd = new Date();

      // Create NodeRun
      await prisma.nodeRun.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: node.type,
          status: result.status === "completed" ? "completed" : "failed",
          inputJson: JSON.stringify(ctx.data),
          outputJson: JSON.stringify(result.output),
          evidenceJson: JSON.stringify(result.evidence),
          startedAt: nodeStart,
          completedAt: nodeEnd,
        },
      });

      // Merge output into context for downstream nodes
      if (result.output) {
        ctx.data = { ...ctx.data, [`${node.id}_output`]: result.output };
      }

      // Process side effects
      if (result.sideEffects) {
        for (const effect of result.sideEffects) {
          try {
            if (effect.type === "review_item") {
              const item = await prisma.reviewItem.create({
                data: effect.data as {
                  sourceType: string;
                  sourceId: string;
                  suggestedJson: string;
                  confidence: number;
                  status: string;
                },
              });
              sideEffects.push({ type: "review_item", id: item.id });
            } else if (effect.type === "approval") {
              const approval = await prisma.approval.create({
                data: effect.data as {
                  actionType: string;
                  targetType: string;
                  targetId: string;
                  riskLevel: string;
                  status: string;
                  title: string;
                  description: string;
                  evidenceJson: string;
                },
              });
              sideEffects.push({ type: "approval", id: approval.id });
            }
          } catch (err) {
            console.error(`Side effect ${effect.type} failed:`, err);
          }
        }
      }

      // Handle branching: if this node specifies a nextEdgeFilter,
      // only follow edges that match
      if (result.nextEdgeFilter) {
        const outEdges = edgeMap.get(nodeId) ?? [];
        const matchingTargets = outEdges
          .filter((e) => e.label === result.nextEdgeFilter || e.when === result.nextEdgeFilter)
          .map((e) => e.target);

        // Mark non-matching downstream nodes as unreachable
        const nonMatchingTargets = outEdges
          .filter((e) => e.label !== result.nextEdgeFilter && e.when !== result.nextEdgeFilter)
          .map((e) => e.target);

        for (const target of nonMatchingTargets) {
          // Only remove if no other visited node also leads to this target
          const otherIncoming = config.edges.filter(
            (e) => e.target === target && e.source !== nodeId && visitedNodes.has(e.source)
          );
          if (otherIncoming.length === 0) {
            reachableNodes.delete(target);
          }
        }

        // Ensure matching targets remain reachable
        for (const target of matchingTargets) {
          reachableNodes.add(target);
        }
      }

      if (result.status === "completed") {
        nodesCompleted++;
      } else {
        nodesFailed++;
      }

      // Update run status based on node result
      if (result.status === "needs_review") {
        runStatus = "needs_review";
      } else if (result.status === "awaiting_approval") {
        runStatus = "awaiting_approval";
      }
    } catch (err) {
      // Node execution failed
      const nodeEnd = new Date();
      await prisma.nodeRun.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: node.type,
          status: "failed",
          outputJson: JSON.stringify({
            error: err instanceof Error ? err.message : "Unknown error",
          }),
          startedAt: nodeStart,
          completedAt: nodeEnd,
        },
      });
      nodesFailed++;
      runStatus = "failed";
      break; // Stop on failure
    }
  }

  // 6. Finalize run
  const completedAt = new Date();
  const finalStatus = nodesFailed > 0 ? "failed" : runStatus === "running" ? "completed" : runStatus;
  const duration = completedAt.getTime() - now.getTime();

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus === "running" ? "completed" : finalStatus,
      completedAt,
      summaryJson: JSON.stringify({
        nodesCompleted,
        nodesFailed,
        nodesSkipped: sortedNodeIds.length - nodesCompleted - nodesFailed,
        duration,
        sideEffects: sideEffects.length,
      }),
    },
  });

  // 7. Write run completion audit
  await writeAudit({
    eventType: "workflow_run_created",
    actor: "system",
    targetType: "workflow_run",
    targetId: run.id,
    summary: `Workflow "${template.name}" completed: ${nodesCompleted}/${sortedNodeIds.length} nodes, ${sideEffects.length} side effects`,
    runId: run.id,
    afterJson: {
      templateId,
      templateName: template.name,
      status: finalStatus,
      nodesCompleted,
      nodesFailed,
      sideEffects,
    },
  });

  return {
    runId: run.id,
    status: finalStatus === "running" ? "completed" : finalStatus,
    nodesCompleted,
    nodesFailed,
    sideEffects,
  };
}
