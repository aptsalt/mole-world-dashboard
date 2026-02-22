import { broadcastSSE } from "@/lib/sse-broadcast";
import type { SSEEventType } from "@/lib/sse-broadcast";

// Re-export for convenience
export type { SSEEventType };

/**
 * Broadcast an SSE event to all connected clients.
 */
export function broadcast(type: SSEEventType, data: unknown) {
  broadcastSSE(type, data);
}
