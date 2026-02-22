import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const STATE_DIR = path.resolve(process.cwd(), "automation", "state");
const VALID_PLATFORMS = ["x", "instagram", "tiktok", "youtube"];
const CACHE_TTL_MS = 600_000; // 10 minutes

function feedPath(platform: string, category: string): string {
  const suffix = category === "default" ? "" : `-${category}`;
  return path.join(STATE_DIR, `research-${platform}${suffix}.json`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 });
  }

  const url = new URL(_request.url);
  const category = url.searchParams.get("category") ?? "default";

  try {
    const filePath = feedPath(platform, category);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        platform,
        category,
        items: [],
        lastFetchedAt: null,
        fetchDurationMs: 0,
        error: null,
      });
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const feed = JSON.parse(raw);
    return NextResponse.json(feed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "default";
  const force = url.searchParams.get("force") === "true";

  // Check cache
  if (!force) {
    const filePath = feedPath(platform, category);
    if (fs.existsSync(filePath)) {
      try {
        const feed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (feed.lastFetchedAt) {
          const age = Date.now() - new Date(feed.lastFetchedAt).getTime();
          if (age < CACHE_TTL_MS) {
            return NextResponse.json({ status: "cached", age: Math.round(age / 1000) });
          }
        }
      } catch { /* proceed to refresh */ }
    }
  }

  // Spawn scraper process
  const scraperFile = path.resolve(process.cwd(), "automation", "src", "research", `${platform}-scraper.ts`);
  if (!fs.existsSync(scraperFile)) {
    return NextResponse.json({ error: `Scraper not found: ${platform}` }, { status: 404 });
  }

  const args = ["tsx", scraperFile];
  if (category !== "default") args.push(category);

  const child = spawn("npx", args, {
    cwd: process.cwd(),
    stdio: "ignore",
    detached: true,
    env: { ...process.env },
  });
  child.unref();

  return NextResponse.json({ status: "started", platform, category, pid: child.pid });
}
