import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const QUEUE_PATH = path.resolve(process.cwd(), "automation", "state", "content-queue.json");

function loadQueue(): Record<string, unknown>[] {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
}

function saveQueue(queue: Record<string, unknown>[]): void {
  const tmpFile = QUEUE_PATH + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(queue, null, 2));
  fs.renameSync(tmpFile, QUEUE_PATH);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const queue = loadQueue();
    const idx = queue.findIndex((p) => p.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const post = queue[idx] as Record<string, unknown>;
    const platforms = post.platforms as Record<string, Record<string, unknown>> | undefined;

    if (!platforms) {
      return NextResponse.json({ error: "No platforms configured" }, { status: 400 });
    }

    // Mark enabled platforms as "scheduled" (social worker will pick them up)
    const now = new Date().toISOString();
    let scheduled = 0;
    for (const [, config] of Object.entries(platforms)) {
      if (config.enabled && config.status === "draft") {
        config.status = "scheduled";
        scheduled++;
      }
    }

    if (scheduled === 0) {
      return NextResponse.json({ error: "No platforms enabled for posting" }, { status: 400 });
    }

    post.scheduledAt = now;
    post.updatedAt = now;
    saveQueue(queue);

    return NextResponse.json({ scheduled, post: queue[idx] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
