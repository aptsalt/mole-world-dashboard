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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const updates = await request.json() as Record<string, unknown>;
    const queue = loadQueue();
    const idx = queue.findIndex((p) => p.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    Object.assign(queue[idx], updates, { updatedAt: new Date().toISOString() });
    saveQueue(queue);
    return NextResponse.json(queue[idx]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    queue.splice(idx, 1);
    saveQueue(queue);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
