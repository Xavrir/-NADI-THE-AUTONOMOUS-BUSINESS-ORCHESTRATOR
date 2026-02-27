import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const snapshots = await prisma.unitEconomicsSnapshot.findMany({
    include: { product: true },
    orderBy: [{ sku: "asc" }, { channel: "asc" }],
  });

  return NextResponse.json(
    snapshots.map((s) => ({
      id: s.id,
      sku: s.sku,
      productName: s.product.name,
      channel: s.channel,
      price: s.price,
      cogs: s.cogs,
      feePct: s.feePct,
      netMarginPct: s.netMarginPct,
      status: s.status,
      createdAt: s.createdAt,
    }))
  );
}
