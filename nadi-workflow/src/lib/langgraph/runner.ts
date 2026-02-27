import { Command, isGraphInterrupt, isInterrupted } from "@langchain/langgraph";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { buildGraph } from "./build-graph";
import type { WorkflowState } from "./state";

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

export async function runWorkflowLangGraph(
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

  // 3. Build initial state
  const initialState: Partial<WorkflowState> = {
    runId: run.id,
    templateId,
    templateName: template.name,
    triggerType,
    data: {},
    nodesCompleted: 0,
    nodesFailed: 0,
    sideEffects: [],
  };

  // 4. Build and run the graph
  const compiledGraph = buildGraph(config.nodes, config.edges);
  const threadConfig = { configurable: { thread_id: run.id } };

  let finalState: WorkflowState | null = null;
  let runStatus = "completed";
  let interrupted = false;

  try {
    const result = await compiledGraph.invoke(initialState, threadConfig);
    if (isInterrupted(result)) {
      interrupted = true;
      runStatus = "awaiting_approval";
      const snapshot = await compiledGraph.getState(threadConfig);
      if (snapshot?.values) {
        finalState = snapshot.values as WorkflowState;
      }
    } else {
      finalState = result as WorkflowState;
    }
  } catch (err) {
    if (isGraphInterrupt(err)) {
      interrupted = true;
      runStatus = "awaiting_approval";
      const snapshot = await compiledGraph.getState(threadConfig);
      if (snapshot?.values) {
        finalState = snapshot.values as WorkflowState;
      }
    } else {
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "failed", completedAt: new Date() },
      });
      throw err;
    }
  }

  const nodesCompleted = finalState?.nodesCompleted ?? 0;
  const nodesFailed = finalState?.nodesFailed ?? 0;
  const sideEffects = finalState?.sideEffects ?? [];

  if (!interrupted) {
    // Normal completion
    const completedAt = new Date();
    const duration = completedAt.getTime() - now.getTime();

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: runStatus,
        completedAt,
        summaryJson: JSON.stringify({
          nodesCompleted,
          nodesFailed,
          duration,
          sideEffects: sideEffects.length,
          engine: "langgraph",
        }),
      },
    });

    await writeAudit({
      eventType: "workflow_run_created",
      actor: "system",
      targetType: "workflow_run",
      targetId: run.id,
      summary: `Workflow "${template.name}" completed via LangGraph: ${nodesCompleted} nodes, ${sideEffects.length} side effects`,
      runId: run.id,
      afterJson: {
        templateId,
        templateName: template.name,
        status: runStatus,
        nodesCompleted,
        nodesFailed,
        sideEffects,
        engine: "langgraph",
      },
    });
  }

  return {
    runId: run.id,
    status: runStatus,
    nodesCompleted,
    nodesFailed,
    sideEffects,
  };
}

export async function resumeWorkflow(
  runId: string,
  decision: { approved: boolean }
): Promise<{
  runId: string;
  status: string;
  nodesCompleted: number;
  nodesFailed: number;
  sideEffects: Array<{ type: string; id?: string }>;
}> {
  // 1. Load the run to get templateId
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { template: true },
  });

  if (!run) {
    throw new Error(`WorkflowRun not found: ${runId}`);
  }

  if (run.status !== "awaiting_approval") {
    throw new Error(`Run ${runId} is not awaiting approval (status: ${run.status})`);
  }

  const config: TemplateConfig = JSON.parse(run.template.configJson);
  const compiledGraph = buildGraph(config.nodes, config.edges);
  const threadConfig = { configurable: { thread_id: runId } };

  // 2. Resume with the decision
  const resumeCommand = new Command({ resume: decision });

  let finalState: WorkflowState | null = null;
  let runStatus = "completed";

  try {
    const result = await compiledGraph.invoke(resumeCommand, threadConfig);
    if (isInterrupted(result)) {
      runStatus = "awaiting_approval";
      const snapshot = await compiledGraph.getState(threadConfig);
      if (snapshot?.values) {
        finalState = snapshot.values as WorkflowState;
      }
    } else {
      finalState = result as WorkflowState;
    }
  } catch (err) {
    if (isGraphInterrupt(err)) {
      runStatus = "awaiting_approval";
      const snapshot = await compiledGraph.getState(threadConfig);
      if (snapshot?.values) {
        finalState = snapshot.values as WorkflowState;
      }
    } else {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "failed", completedAt: new Date() },
      });
      throw err;
    }
  }

  const nodesCompleted = finalState?.nodesCompleted ?? 0;
  const nodesFailed = finalState?.nodesFailed ?? 0;
  const sideEffects = finalState?.sideEffects ?? [];

  const completedAt = new Date();

  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: runStatus,
      completedAt: runStatus !== "awaiting_approval" ? completedAt : undefined,
      summaryJson: JSON.stringify({
        nodesCompleted,
        nodesFailed,
        sideEffects: sideEffects.length,
        engine: "langgraph",
        resumed: true,
        decision,
      }),
    },
  });

  await writeAudit({
    eventType: "workflow_run_resumed",
    actor: "owner",
    targetType: "workflow_run",
    targetId: runId,
    summary: `Workflow "${run.template.name}" resumed: decision=${decision.approved ? "approved" : "rejected"}, status=${runStatus}`,
    runId,
    afterJson: {
      runStatus,
      nodesCompleted,
      decision,
      engine: "langgraph",
    },
  });

  return {
    runId,
    status: runStatus,
    nodesCompleted,
    nodesFailed,
    sideEffects,
  };
}
