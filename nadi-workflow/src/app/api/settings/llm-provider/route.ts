import { NextRequest, NextResponse } from "next/server";
import { getProvider, setProvider, type ProviderType } from "@/lib/llm-provider";

export async function GET() {
  return NextResponse.json({ provider: getProvider() });
}

export async function POST(req: NextRequest) {
  const { provider } = await req.json();

  if (provider !== "stub" && provider !== "pollinations") {
    return NextResponse.json(
      { error: "Invalid provider. Use 'stub' or 'pollinations'" },
      { status: 400 }
    );
  }

  setProvider(provider as ProviderType);
  return NextResponse.json({ provider: getProvider() });
}
