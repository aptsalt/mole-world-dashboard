import { NextRequest } from "next/server";
import { subscribers } from "@/lib/sse-broadcast";

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const sub = { controller, lastPing: Date.now() };
      subscribers.add(sub);

      // Send initial connection event
      const hello = `event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString(), clients: subscribers.size })}\n\n`;
      controller.enqueue(new TextEncoder().encode(hello));

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const msg = `event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(msg));
          sub.lastPing = Date.now();
        } catch {
          clearInterval(heartbeat);
          subscribers.delete(sub);
        }
      }, 30_000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
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
