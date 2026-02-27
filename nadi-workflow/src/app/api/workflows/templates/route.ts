import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.workflowTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    templates.map((t) => ({
      ...t,
      configJson: JSON.parse(t.configJson),
    }))
  );
}
