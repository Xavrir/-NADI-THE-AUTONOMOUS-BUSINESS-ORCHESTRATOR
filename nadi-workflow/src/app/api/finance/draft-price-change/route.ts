import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

/* -- POST /api/finance/draft-price-change --------------------------
   Creates an Approval for a proposed price change.
   Body: { sku, channel, newPrice }
   Deterministic: computes new margin from existing COGS + feePct.
   ----------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const { sku, channel, newPrice } = await req.json();

    if (!sku || !newPrice || typeof newPrice !== "number") {
      return NextResponse.json({ error: "sku and newPrice (number) are required" }, { status: 400 });
    }

    const ch = channel ?? "shopify";

    // Fetch current snapshot
    const current = await prisma.unitEconomicsSnapshot.findFirst({
      where: { sku, channel: ch },
      orderBy: { createdAt: "desc" },
      include: { product: true },
    });

    if (!current) {
      return NextResponse.json({ error: "No economics snapshot found for this SKU/channel" }, { status: 404 });
    }

    // Fetch active policy
    const policy = await prisma.policy.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    const minMarginPct = policy?.minMarginPct ?? 0.2;
    const maxDiscountPct = policy?.maxDiscountPct ?? 0.15;

    // Deterministic margin computation
    const feeAmount = Math.round(newPrice * current.feePct);
    const newNetMargin = newPrice - current.cogs - feeAmount;
    const newNetMarginPct = newNetMargin / newPrice;

    // Compute discount from current price
    const discountPct = (current.price - newPrice) / current.price;

    // Policy evaluation
    const violations: string[] = [];
    if (newNetMarginPct < minMarginPct) {
      violations.push(`Net margin ${(newNetMarginPct * 100).toFixed(1)}% below minimum ${(minMarginPct * 100).toFixed(0)}%`);
    }
    if (discountPct > maxDiscountPct) {
      violations.push(`Discount ${(discountPct * 100).toFixed(1)}% exceeds maximum ${(maxDiscountPct * 100).toFixed(0)}%`);
    }

    const riskLevel = violations.length > 0 ? "high" : newNetMarginPct < minMarginPct + 0.05 ? "medium" : "low";

    // Before / After simulation
    const beforeState = {
      sku,
      channel: ch,
      productName: current.product.name,
      price: current.price,
      cogs: current.cogs,
      feePct: current.feePct,
      netMarginPct: current.netMarginPct,
      status: current.status,
    };

    const newStatus = newNetMarginPct < minMarginPct ? "critical" : newNetMarginPct < minMarginPct + 0.05 ? "warning" : "healthy";

    const afterState = {
      sku,
      channel: ch,
      productName: current.product.name,
      price: newPrice,
      cogs: current.cogs,
      feePct: current.feePct,
      netMarginPct: Math.round(newNetMarginPct * 1000) / 1000,
      status: newStatus,
    };

    // Create approval
    const approval = await prisma.approval.create({
      data: {
        actionType: "price_change",
        targetType: "unit_economics",
        targetId: current.id,
        riskLevel,
        status: "pending",
        confidence: null,
        title: `Price change: ${current.product.name} (${ch})`,
        description: `${current.price.toLocaleString()} → ${newPrice.toLocaleString()} IDR` +
          (violations.length > 0 ? ` | Policy: ${violations.join("; ")}` : ""),
        beforeJson: JSON.stringify(beforeState),
        afterJson: JSON.stringify(afterState),
        evidenceJson: JSON.stringify({
          violations,
          policyVersion: policy?.version ?? 1,
          computedMargin: Math.round(newNetMarginPct * 1000) / 1000,
          computedDiscount: Math.round(discountPct * 1000) / 1000,
        }),
      },
    });

    // Write audit
    await writeAudit({
      eventType: "finance.price_change_drafted",
      actor: "operator",
      targetType: "unit_economics",
      targetId: current.id,
      summary: `Draft price change: ${current.product.name} (${ch}) ${current.price} → ${newPrice}`,
      beforeJson: beforeState,
      afterJson: afterState,
      approvalId: approval.id,
      policyJson: {
        version: policy?.version ?? 1,
        minMarginPct,
        maxDiscountPct,
        violations,
      },
    });

    return NextResponse.json({
      approvalId: approval.id,
      riskLevel,
      before: beforeState,
      after: afterState,
      violations,
    });
  } catch (err) {
    console.error("Draft price change error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create draft" },
      { status: 500 }
    );
  }
}
