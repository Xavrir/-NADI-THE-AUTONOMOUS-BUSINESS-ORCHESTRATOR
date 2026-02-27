import { NextResponse } from "next/server";
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
