import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  const session = jar.get("nadi_session");

  if (!session?.value) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const decoded = JSON.parse(Buffer.from(session.value, "base64").toString("utf-8"));
    return NextResponse.json({ user: decoded });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
