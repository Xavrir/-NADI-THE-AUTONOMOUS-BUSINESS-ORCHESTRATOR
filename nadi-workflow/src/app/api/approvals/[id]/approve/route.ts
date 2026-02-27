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

  // Execute side effects based on action type
  if (approval.actionType === "price_change" && approval.afterJson) {
    await executePriceChange(approval, id);
  }

  return NextResponse.json(updated);
}

/* -- Execute price change on approval ----------------------------- */
async function executePriceChange(approval: { targetId: string | null; afterJson: string | null }, approvalId: string) {
  if (!approval.afterJson || !approval.targetId) return;

  const afterState = JSON.parse(approval.afterJson) as {
    sku?: string;
    channel: string;
    price: number;
    cogs?: number;
    feePct?: number;
    netMarginPct: number;
    status?: string;
  };

  // Fallback to approval.targetId if sku is missing
  const sku = afterState.sku ?? approval.targetId;
  const cogs = afterState.cogs;
  const feePct = afterState.feePct;
  const status = afterState.status;

  // Only create snapshot if all required fields are present
  if (cogs !== undefined && feePct !== undefined && status !== undefined) {
    await prisma.unitEconomicsSnapshot.create({
      data: {
        sku,
        channel: afterState.channel,
        price: afterState.price,
        cogs,
        feePct,
        netMarginPct: afterState.netMarginPct,
        status,
      },
    });
  }

  // Update product price if Shopify (primary)
  if (afterState.channel === "shopify") {
    await prisma.product.update({
      where: { sku },
      data: { price: afterState.price },
    });
  }

  await writeAudit({
    eventType: "finance.price_change_executed",
    actor: "system",
    targetType: "unit_economics",
    targetId: approval.targetId,
    summary: `Price change applied: ${sku} (${afterState.channel}) → ${afterState.price} IDR`,
    afterJson: afterState,
    approvalId,
  });
}
