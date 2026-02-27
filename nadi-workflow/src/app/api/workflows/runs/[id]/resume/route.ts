import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
    const body = await req.json();
    const { approved } = body as { approved: boolean };

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved (boolean) is required" },
        { status: 400 }
      );
    }

    const { resumeWorkflow } = await import("@/lib/langgraph/runner");
    const result = await resumeWorkflow(runId, { approved });

    return NextResponse.json({
      id: result.runId,
      status: result.status,
      nodesCompleted: result.nodesCompleted,
      nodesFailed: result.nodesFailed,
      sideEffects: result.sideEffects,
    });
  } catch (err) {
    console.error("Resume workflow error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resume failed" },
      { status: 500 }
    );
  }
}
