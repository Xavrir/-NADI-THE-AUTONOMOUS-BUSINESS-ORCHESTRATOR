import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const approval = await prisma.approval.findUnique({ where: { id } });
  if (!approval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (approval.status !== "pending") {
    return NextResponse.json({ error: "Already resolved" }, { status: 400 });
  }

  const updated = await prisma.approval.update({
    where: { id },
    data: {
      status: "approved",
      resolvedBy: "owner",
      resolvedAt: new Date(),
    },
  });

  await writeAudit({
    eventType: "approval_resolved",
    actor: "owner",
    targetType: "approval",
    targetId: id,
    summary: `Approved: ${approval.title}`,
    beforeJson: { status: "pending" },
    afterJson: { status: "approved", resolvedBy: "owner" },
    evidenceJson: approval.evidenceJson ? JSON.parse(approval.evidenceJson) : {},
    approvalId: id,
  });

  return NextResponse.json(updated);
}
