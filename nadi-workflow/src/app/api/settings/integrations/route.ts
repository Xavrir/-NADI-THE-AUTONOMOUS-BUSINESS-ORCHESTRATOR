import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const connectors = await prisma.connectorConfig.findMany({
    orderBy: { type: "asc" },
  });

  return NextResponse.json(
    connectors.map((c) => ({
      ...c,
      configJson: c.configJson ? JSON.parse(c.configJson) : null,
    }))
  );
}
