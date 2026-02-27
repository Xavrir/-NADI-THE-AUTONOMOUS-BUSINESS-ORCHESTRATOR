import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const policy = await prisma.policy.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  if (!policy) {
    return NextResponse.json({ error: "No active policy" }, { status: 404 });
  }

  return NextResponse.json(policy);
}
