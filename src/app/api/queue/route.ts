import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const QUEUE_PATH = path.resolve(process.cwd(), "automation", "state", "queue.json");
const STATE_DIR = path.dirname(QUEUE_PATH);

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
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of queue items" }, { status: 400 });
    }

    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }

    const tmpPath = QUEUE_PATH + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(body, null, 2));
    fs.renameSync(tmpPath, QUEUE_PATH);

    return NextResponse.json({ ok: true, count: body.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
