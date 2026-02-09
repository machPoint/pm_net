import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const [statusResult, healthResult, skillsResult] = await Promise.allSettled([
      execAsync("openclaw status --json", { timeout: 10000 }),
      execAsync("openclaw health --json", { timeout: 10000 }),
      execAsync("openclaw skills list --json", { timeout: 10000 }),
    ]);

    const status = statusResult.status === "fulfilled" ? JSON.parse(statusResult.value.stdout) : null;
    const health = healthResult.status === "fulfilled" ? JSON.parse(healthResult.value.stdout) : null;
    const skills = skillsResult.status === "fulfilled" ? JSON.parse(skillsResult.value.stdout) : null;

    return NextResponse.json({
      ok: true,
      status,
      health,
      skills,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
