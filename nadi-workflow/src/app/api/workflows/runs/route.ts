import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const runs = await prisma.workflowRun.findMany({
    include: {
      template: { select: { name: true } },
      nodeRuns: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    runs.map((r) => ({
      ...r,
      templateName: r.template.name,
      summaryJson: r.summaryJson ? JSON.parse(r.summaryJson) : null,
      nodeRuns: r.nodeRuns.map((n) => ({
        ...n,
        inputJson: n.inputJson ? JSON.parse(n.inputJson) : null,
        outputJson: n.outputJson ? JSON.parse(n.outputJson) : null,
        evidenceJson: n.evidenceJson ? JSON.parse(n.evidenceJson) : null,
      })),
    }))
  );
}

/* -- POST /api/workflows/runs — Trigger a new workflow run -------- */
export async function POST(req: NextRequest) {
  try {
    const { templateId, triggerType, input } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }

    const engineModule =
      process.env.WORKFLOW_ENGINE === "langgraph"
        ? await import("@/lib/langgraph/runner")
        : await import("@/lib/run-engine");

    const runFn =
      "runWorkflowLangGraph" in engineModule
        ? engineModule.runWorkflowLangGraph
        : engineModule.runWorkflow;

    const result = await runFn(templateId, triggerType ?? "manual", input);

    return NextResponse.json({
      id: result.runId,
      status: result.status,
      nodesCompleted: result.nodesCompleted,
      nodesFailed: result.nodesFailed,
      sideEffects: result.sideEffects,
    });
  } catch (err) {
    console.error("Run workflow error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Run failed" },
      { status: 500 }
    );
  }
}
