"use client";

import { useState, memo } from "react";
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  RotateCcw,
} from "lucide-react";
import type { AutomationEvent } from "@/lib/types";

function typeIcon(type: string) {
  if (type.includes("completed")) return <CheckCircle2 size={12} className="text-success" />;
  if (type.includes("failed") || type.includes("error")) return <XCircle size={12} className="text-red-400" />;
  if (type.includes("retry")) return <RotateCcw size={12} className="text-warning" />;
  if (type.includes("credits")) return <AlertTriangle size={12} className="text-warning" />;
  if (type.includes("started")) return <Play size={12} className="text-cyan" />;
  if (type.includes("stopped")) return <Square size={12} className="text-muted" />;
  return <Activity size={12} className="text-muted" />;
}

const EventRow = memo(function EventRow({ event }: { event: AutomationEvent }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02]">
      <div className="mt-0.5">{typeIcon(event.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white">{event.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.shotId && (
            <span className="font-mono text-[10px] text-muted">{event.shotId}</span>
          )}
          <span className="text-[10px] text-muted">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
});

export function EventFeed({ events }: { events: AutomationEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? events : events.slice(-10);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyan" />
          <span className="text-xs font-semibold text-white">Activity Feed</span>
          <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted">{events.length}</span>
        </div>
        {events.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-muted hover:text-cyan transition-colors"
          >
            {showAll ? "Show recent" : "Show all"}
          </button>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]">
        {displayed.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted">No events yet</div>
        )}
        {[...displayed].reverse().map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
