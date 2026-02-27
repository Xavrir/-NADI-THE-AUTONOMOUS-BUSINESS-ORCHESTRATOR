import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const run = await prisma.workflowRun.findUnique({
    where: { id },
    include: {
      template: true,
      nodeRuns: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...run,
    summaryJson: run.summaryJson ? JSON.parse(run.summaryJson) : null,
    template: {
      ...run.template,
      configJson: JSON.parse(run.template.configJson),
    },
    nodeRuns: run.nodeRuns.map((n) => ({
      ...n,
      inputJson: n.inputJson ? JSON.parse(n.inputJson) : null,
      outputJson: n.outputJson ? JSON.parse(n.outputJson) : null,
      evidenceJson: n.evidenceJson ? JSON.parse(n.evidenceJson) : null,
    })),
  });
}
