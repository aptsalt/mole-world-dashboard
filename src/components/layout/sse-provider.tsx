"use client";

import { useSSE } from "@/lib/use-sse";
import { useDashboardStore } from "@/lib/store";
import { useCallback } from "react";

export function SSEProvider() {
  const { refreshAutomation, refreshAll } = useDashboardStore();

  const handlers = {
    "automation:status": useCallback(() => {
      refreshAutomation();
    }, [refreshAutomation]),
    "automation:queue": useCallback(() => {
      refreshAutomation();
    }, [refreshAutomation]),
    "automation:event": useCallback(() => {
      refreshAutomation();
    }, [refreshAutomation]),
    "narration:update": useCallback(() => {
      /* narration pages handle their own refresh */
    }, []),
    "content:update": useCallback(() => {
      /* distribution pages handle their own refresh */
    }, []),
    "orchestrate:update": useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  };

  useSSE({
    handlers,
    enabled: true,
    fallbackInterval: 30_000,
    fallbackFn: refreshAll,
  });

  return null;
}
