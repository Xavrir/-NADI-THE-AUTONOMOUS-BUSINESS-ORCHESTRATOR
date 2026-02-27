import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { confidenceThreshold, minMarginPct, maxDiscountPct, highValueThreshold } = body;

    // Get current active policy
    const current = await prisma.policy.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    if (!current) {
      return NextResponse.json({ error: "No active policy found" }, { status: 404 });
    }

    const beforeState = {
      version: current.version,
      confidenceThreshold: current.confidenceThreshold,
      minMarginPct: current.minMarginPct,
      maxDiscountPct: current.maxDiscountPct,
      highValueThreshold: current.highValueThreshold,
    };

    // Deactivate current
    await prisma.policy.update({
      where: { id: current.id },
      data: { isActive: false },
    });

    // Create new version
    const newPolicy = await prisma.policy.create({
      data: {
        version: current.version + 1,
        confidenceThreshold: confidenceThreshold ?? current.confidenceThreshold,
        minMarginPct: minMarginPct ?? current.minMarginPct,
        maxDiscountPct: maxDiscountPct ?? current.maxDiscountPct,
        highValueThreshold: highValueThreshold ?? current.highValueThreshold,
        isActive: true,
      },
    });

    const afterState = {
      version: newPolicy.version,
      confidenceThreshold: newPolicy.confidenceThreshold,
      minMarginPct: newPolicy.minMarginPct,
      maxDiscountPct: newPolicy.maxDiscountPct,
      highValueThreshold: newPolicy.highValueThreshold,
    };

    await writeAudit({
      eventType: "policy.updated",
      actor: "owner",
      targetType: "policy",
      targetId: newPolicy.id,
      summary: `Policy updated to v${newPolicy.version}`,
      beforeJson: beforeState,
      afterJson: afterState,
      policyJson: afterState,
    });

    return NextResponse.json(newPolicy);
  } catch (err) {
    console.error("Policy update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
