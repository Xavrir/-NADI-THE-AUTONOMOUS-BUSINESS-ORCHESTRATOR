import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const approvals = await prisma.approval.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    approvals.map((a) => ({
      ...a,
      beforeJson: a.beforeJson ? JSON.parse(a.beforeJson) : null,
      afterJson: a.afterJson ? JSON.parse(a.afterJson) : null,
      evidenceJson: a.evidenceJson ? JSON.parse(a.evidenceJson) : null,
    }))
  );
}
