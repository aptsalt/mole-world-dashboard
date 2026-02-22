import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

export async function GET() {
  try {
    if (!fs.existsSync(JOBS_PATH)) {
      return NextResponse.json([]);
    }
    const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8"));
    // Sort newest first
    jobs.sort((a: { createdAt: string }, b: { createdAt: string }) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    return NextResponse.json(jobs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
