import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await prisma.auditLog.findUnique({ where: { id } });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...entry,
    beforeJson: entry.beforeJson ? JSON.parse(entry.beforeJson) : null,
    afterJson: entry.afterJson ? JSON.parse(entry.afterJson) : null,
    evidenceJson: entry.evidenceJson ? JSON.parse(entry.evidenceJson) : null,
    policyJson: entry.policyJson ? JSON.parse(entry.policyJson) : null,
  });
}
