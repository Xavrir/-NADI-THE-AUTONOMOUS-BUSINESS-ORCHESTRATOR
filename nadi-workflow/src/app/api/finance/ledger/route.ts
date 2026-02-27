import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const entries = await prisma.ledgerEntry.findMany({
    include: { transaction: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      date: e.transaction.date,
      description: e.transaction.description,
      debit: e.transaction.debit,
      credit: e.transaction.credit,
      reference: e.transaction.reference,
      category: e.category,
      confidence: e.confidence,
      evidenceId: e.evidenceId,
      status: e.status,
      aiRationale: e.aiRationale,
      createdAt: e.createdAt,
    }))
  );
}
