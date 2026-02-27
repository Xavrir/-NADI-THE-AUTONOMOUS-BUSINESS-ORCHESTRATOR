import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

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
    const { templateId, triggerType } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const config = JSON.parse(template.configJson) as {
      nodes: Array<{ id: string; type: string; label: string }>;
    };

    const now = new Date();

    // Create run
    const run = await prisma.workflowRun.create({
      data: {
        templateId,
        triggerType: triggerType ?? "manual",
        status: "running",
        startedAt: now,
      },
    });

    // Simulate node runs: each node completes in sequence with staggered times
    const nodeResults: Array<{ nodeId: string; status: string }> = [];

    for (let i = 0; i < config.nodes.length; i++) {
      const node = config.nodes[i];
      const nodeStart = new Date(now.getTime() + i * 800);
      const nodeEnd = new Date(nodeStart.getTime() + 400 + Math.random() * 600);

      await prisma.nodeRun.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: node.type,
          status: "completed",
          startedAt: nodeStart,
          completedAt: nodeEnd,
          outputJson: JSON.stringify({
            label: node.label,
            message: `${node.label} completed successfully`,
          }),
        },
      });

      nodeResults.push({ nodeId: node.id, status: "completed" });
    }

    // Finalize run
    const completedAt = new Date(now.getTime() + config.nodes.length * 800 + 500);
    const updatedRun = await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt,
        summaryJson: JSON.stringify({
          nodesCompleted: config.nodes.length,
          nodesFailed: 0,
          duration: completedAt.getTime() - now.getTime(),
        }),
      },
    });

    await writeAudit({
      eventType: "workflow.run_completed",
      actor: "system",
      targetType: "workflow_run",
      targetId: run.id,
      summary: `Workflow "${template.name}" run completed: ${config.nodes.length} nodes`,
      afterJson: {
        templateId,
        templateName: template.name,
        status: "completed",
        nodesCompleted: config.nodes.length,
      },
      evidenceJson: { nodeResults },
    });

    return NextResponse.json({
      id: updatedRun.id,
      status: updatedRun.status,
      templateName: template.name,
      nodesCompleted: config.nodes.length,
    });
  } catch (err) {
    console.error("Run workflow error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Run failed" },
      { status: 500 }
    );
  }
}
