import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const QUEUE_PATH = path.resolve(process.cwd(), "automation", "state", "content-queue.json");

export async function GET() {
  try {
    if (!fs.existsSync(QUEUE_PATH)) {
      return NextResponse.json([]);
    }
    const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
    return NextResponse.json(queue);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { post: Record<string, unknown> };
    const queue = fs.existsSync(QUEUE_PATH)
      ? JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"))
      : [];

    queue.push(body.post);
    const tmpFile = QUEUE_PATH + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(queue, null, 2));
    fs.renameSync(tmpFile, QUEUE_PATH);

    return NextResponse.json({ count: queue.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
