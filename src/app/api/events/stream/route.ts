import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { subscribers } from "@/lib/sse-broadcast";

const STATE_DIR = path.resolve(process.cwd(), "automation", "state");
const EVENTS_PATH = path.join(STATE_DIR, "events.json");
const JOBS_PATH = path.join(STATE_DIR, "whatsapp-jobs.json");

interface SSEEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function readEvents(): SSEEvent[] {
  try {
    if (!fs.existsSync(EVENTS_PATH)) return [];
    return JSON.parse(fs.readFileSync(EVENTS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function readJobStats(): { total: number; pending: number; active: number; completed: number; failed: number } {
  try {
    if (!fs.existsSync(JOBS_PATH)) return { total: 0, pending: 0, active: 0, completed: 0, failed: 0 };
    const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<{ status: string }>;
    const stats = { total: jobs.length, pending: 0, active: 0, completed: 0, failed: 0 };
    for (const j of jobs) {
      switch (j.status) {
        case "pending": stats.pending++; break;
        case "completed": stats.completed++; break;
        case "failed": stats.failed++; break;
        default: stats.active++; break;
      }
    }
    return stats;
  } catch {
    return { total: 0, pending: 0, active: 0, completed: 0, failed: 0 };
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const sub = { controller, lastPing: Date.now() };
      subscribers.add(sub);

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial connection event
      send("connected", { time: new Date().toISOString(), clients: subscribers.size });

      // Send initial job stats
      send("orchestrate:update", { type: "connected", stats: readJobStats() });

      // ── File-polling for events.json + whatsapp-jobs.json ─────
      let lastEventId = "";
      let lastJobHash = "";

      const poll = () => {
        if (closed) return;

        // Check for new automation events
        const events = readEvents();
        const newEvents = lastEventId
          ? events.filter((e) => e.id > lastEventId)
          : events.slice(-5); // Send last 5 on initial connect

        for (const evt of newEvents) {
          send("automation:status", evt);
          lastEventId = evt.id;
        }

        // Check for job stat changes
        const stats = readJobStats();
        const jobHash = JSON.stringify(stats);
        if (jobHash !== lastJobHash) {
          send("orchestrate:update", { type: "jobs_changed", stats });
          lastJobHash = jobHash;
        }
      };

      // Poll every 3 seconds
      const pollInterval = setInterval(poll, 3_000);
      poll(); // Initial poll

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          const msg = `event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(msg));
          sub.lastPing = Date.now();
        } catch {
          closed = true;
          clearInterval(heartbeat);
          clearInterval(pollInterval);
          subscribers.delete(sub);
        }
      }, 30_000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        clearInterval(pollInterval);
        subscribers.delete(sub);
      });
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
