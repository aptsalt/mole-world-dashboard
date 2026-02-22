import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const DIGEST_PATH = path.resolve(process.cwd(), "automation", "state", "news-digest.json");

export async function GET() {
  try {
    if (!fs.existsSync(DIGEST_PATH)) {
      return NextResponse.json({ digests: [] });
    }
    const raw = fs.readFileSync(DIGEST_PATH, "utf-8");
    const digests = JSON.parse(raw);
    if (!Array.isArray(digests)) {
      return NextResponse.json({ digests: [] });
    }
    // Return all digests sorted newest first
    digests.sort((a: { date: string }, b: { date: string }) =>
      b.date.localeCompare(a.date)
    );
    return NextResponse.json({ digests });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
