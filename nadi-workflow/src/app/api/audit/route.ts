import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    entries.map((e) => ({
      ...e,
      beforeJson: e.beforeJson ? JSON.parse(e.beforeJson) : null,
      afterJson: e.afterJson ? JSON.parse(e.afterJson) : null,
      evidenceJson: e.evidenceJson ? JSON.parse(e.evidenceJson) : null,
      policyJson: e.policyJson ? JSON.parse(e.policyJson) : null,
    }))
  );
}
