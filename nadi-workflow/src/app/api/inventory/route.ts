import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { inventory: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    products.map((p) => ({
      sku: p.sku,
      name: p.name,
      reorderPoint: p.reorderPoint,
      inventory: p.inventory
        ? { available: p.inventory.available, reserved: p.inventory.reserved }
        : null,
    }))
  );
}
