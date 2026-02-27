import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { category } = body;

  if (!category) {
    return NextResponse.json({ error: "category required" }, { status: 400 });
  }

  const item = await prisma.reviewItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const suggested = JSON.parse(item.suggestedJson);

  const updated = await prisma.reviewItem.update({
    where: { id },
    data: {
      status: "resolved",
      userFixJson: JSON.stringify({ category, correctedBy: "owner" }),
      resolvedBy: "owner",
      resolvedAt: new Date(),
    },
  });

  if (item.sourceType === "ledger" && item.sourceId) {
    await prisma.ledgerEntry.updateMany({
      where: { transactionId: item.sourceId },
      data: { category, status: "posted", confidence: 1.0 },
    });
  }

  await writeAudit({
    eventType: "review_resolved",
    actor: "owner",
    targetType: "review_item",
    targetId: id,
    summary: `Review corrected: ${suggested.category} → ${category}`,
    beforeJson: { category: suggested.category, confidence: item.confidence },
    afterJson: { category, confidence: 1.0, correctedBy: "owner" },
  });

  return NextResponse.json(updated);
}
