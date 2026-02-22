// Event types that can be pushed
export type SSEEventType =
  | "automation:status"
  | "automation:queue"
  | "automation:event"
  | "narration:update"
  | "content:update"
  | "orchestrate:update"
  | "heartbeat";

// In-memory subscriber management
type Subscriber = {
  controller: ReadableStreamDefaultController;
  lastPing: number;
};

export const subscribers = new Set<Subscriber>();

// Helper to broadcast events to all connected clients
export function broadcastSSE(type: SSEEventType, data: unknown) {
  const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  const dead: Subscriber[] = [];
  for (const sub of subscribers) {
    try {
      sub.controller.enqueue(new TextEncoder().encode(message));
    } catch {
      dead.push(sub);
    }
  }
  for (const sub of dead) subscribers.delete(sub);
}
