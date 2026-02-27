import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const items = await prisma.reviewItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    items.map((r) => ({
      ...r,
      suggestedJson: JSON.parse(r.suggestedJson),
      userFixJson: r.userFixJson ? JSON.parse(r.userFixJson) : null,
    }))
  );
}
