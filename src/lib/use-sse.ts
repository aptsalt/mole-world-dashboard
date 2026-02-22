"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { create } from "zustand";

// ── SSE Status ───────────────────────────────────────────────────

type SSEStatus = "connecting" | "connected" | "disconnected";

interface SSEStatusStore {
  status: SSEStatus;
  setStatus: (s: SSEStatus) => void;
}

export const useSSEStatus = create<SSEStatusStore>((set) => ({
  status: "disconnected",
  setStatus: (status) => set({ status }),
}));

// ── useSSE Hook ──────────────────────────────────────────────────

interface UseSSEOptions {
  /** Called when any event is received */
  onEvent?: (type: string, data: unknown) => void;
  /** Specific event handlers */
  handlers?: Record<string, (data: unknown) => void>;
  /** Whether SSE is enabled (default: true) */
  enabled?: boolean;
  /** Fallback polling interval in ms when SSE disconnects (default: 15000) */
  fallbackInterval?: number;
  /** Fallback polling function */
  fallbackFn?: () => Promise<void>;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    onEvent,
    handlers,
    enabled = true,
    fallbackInterval = 15_000,
    fallbackFn,
  } = options;

  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const sourceRef = useRef<EventSource | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);

  // Stable refs for callbacks to avoid re-connecting on every render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const fallbackFnRef = useRef(fallbackFn);
  fallbackFnRef.current = fallbackFn;

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current);
      fallbackRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackFnRef.current && !fallbackRef.current) {
      fallbackRef.current = setInterval(() => {
        fallbackFnRef.current?.();
      }, fallbackInterval);
    }
  }, [fallbackInterval]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current);
      fallbackRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    cleanup();
    setStatus("connecting");
    useSSEStatus.getState().setStatus("connecting");

    const source = new EventSource("/api/events/stream");
    sourceRef.current = source;

    source.addEventListener("connected", () => {
      setStatus("connected");
      useSSEStatus.getState().setStatus("connected");
      retriesRef.current = 0;
      stopFallbackPolling();
    });

    source.addEventListener("heartbeat", () => {
      // Connection still alive
    });

    // Register specific event handlers via a generic listener
    const eventTypes = [
      "automation:status",
      "automation:queue",
      "automation:event",
      "narration:update",
      "content:update",
      "orchestrate:update",
    ];

    for (const eventType of eventTypes) {
      source.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current?.[eventType]?.(data);
          onEventRef.current?.(eventType, data);
        } catch {
          // Invalid JSON
        }
      });
    }

    source.onerror = () => {
      source.close();
      sourceRef.current = null;
      setStatus("disconnected");
      useSSEStatus.getState().setStatus("disconnected");

      // Start fallback polling
      startFallbackPolling();

      // Reconnect with exponential backoff (max 30s)
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
      retriesRef.current++;
      reconnectRef.current = setTimeout(connect, delay);
    };
  }, [enabled, cleanup, startFallbackPolling, stopFallbackPolling]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return cleanup;
  }, [enabled, connect, cleanup]);

  return { status };
}
