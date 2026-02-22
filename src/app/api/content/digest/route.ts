import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const DIGEST_PATH = path.resolve(process.cwd(), "automation", "state", "news-digest.json");

export async function GET() {
  try {
    if (!fs.existsSync(DIGEST_PATH)) {
      return NextResponse.json({ digest: null });
    }
    const digests = JSON.parse(fs.readFileSync(DIGEST_PATH, "utf-8"));
    if (!Array.isArray(digests) || digests.length === 0) {
      return NextResponse.json({ digest: null });
    }
    // Return today's digest (latest by date)
    const today = new Date().toISOString().slice(0, 10);
    const todayDigest = digests.find((d: { date: string }) => d.date === today);
    return NextResponse.json({ digest: todayDigest ?? digests[digests.length - 1] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Spawn the news curator process
    const curatorPath = path.resolve(process.cwd(), "automation", "src", "news-curator.ts");
    const child = spawn("npx", ["tsx", curatorPath], {
      detached: true,
      stdio: "ignore",
      cwd: path.resolve(process.cwd(), "automation"),
    });
    child.unref();

    return NextResponse.json({ status: "started", pid: child.pid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
