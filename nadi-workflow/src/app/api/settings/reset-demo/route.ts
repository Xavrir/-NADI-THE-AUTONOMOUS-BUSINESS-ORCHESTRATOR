import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export async function POST() {
  try {
    const projectRoot = path.resolve(process.cwd());

    execSync("npx prisma db push --force-reset --accept-data-loss", {
      cwd: projectRoot,
      timeout: 30000,
      stdio: "pipe",
    });

    execSync("npx prisma db seed", {
      cwd: projectRoot,
      timeout: 30000,
      stdio: "pipe",
    });

    return NextResponse.json({
      success: true,
      message: "Demo data reset successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Demo reset failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
