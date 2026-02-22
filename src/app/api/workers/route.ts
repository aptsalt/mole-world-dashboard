import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { join } from "path";

const STATE_DIR = join(process.cwd(), "automation", "state");
const WORKERS_FILE = join(STATE_DIR, "workers.json");

interface WorkerConfig {
  id: string;
  type: "image" | "video" | "tts" | "social";
  status: "idle" | "running" | "paused" | "error";
  priority: number; // 1 = highest
  currentJob?: string;
  processedCount: number;
  failedCount: number;
  lastActivity?: string;
}

interface WorkerState {
  workers: WorkerConfig[];
  priorityRules: {
    chat: number;
    image: number;
    clip: number;
    lesson: number;
  };
  parallelEnabled: boolean;
  maxConcurrent: number;
}

const DEFAULT_STATE: WorkerState = {
  workers: [
    { id: "image-worker", type: "image", status: "idle", priority: 2, processedCount: 0, failedCount: 0 },
    { id: "video-worker", type: "video", status: "idle", priority: 3, processedCount: 0, failedCount: 0 },
    { id: "tts-worker", type: "tts", status: "idle", priority: 2, processedCount: 0, failedCount: 0 },
    { id: "social-worker", type: "social", status: "idle", priority: 4, processedCount: 0, failedCount: 0 },
  ],
  priorityRules: {
    chat: 1,    // Instant
    image: 2,   // Fast
    clip: 3,    // Medium
    lesson: 4,  // Slow
  },
  parallelEnabled: false,
  maxConcurrent: 2,
};

async function readState(): Promise<WorkerState> {
  try {
    const data = await readFile(WORKERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: WorkerState) {
  await mkdir(STATE_DIR, { recursive: true });
  const tmp = WORKERS_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, WORKERS_FILE);
}

export async function GET() {
  const state = await readState();
  return NextResponse.json(state);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const state = await readState();

  if (body.parallelEnabled !== undefined) {
    state.parallelEnabled = body.parallelEnabled;
  }
  if (body.maxConcurrent !== undefined) {
    state.maxConcurrent = body.maxConcurrent;
  }
  if (body.priorityRules) {
    Object.assign(state.priorityRules, body.priorityRules);
  }
  if (body.workerAction && body.workerId) {
    const worker = state.workers.find((w) => w.id === body.workerId);
    if (worker) {
      if (body.workerAction === "pause") worker.status = "paused";
      if (body.workerAction === "resume") worker.status = "idle";
      if (body.workerAction === "reset") {
        worker.status = "idle";
        worker.processedCount = 0;
        worker.failedCount = 0;
        worker.currentJob = undefined;
      }
    }
  }

  await writeState(state);
  return NextResponse.json(state);
}
