"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  Image as ImageIcon,
  Video,
  AudioLines,
  Send,
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { getWorkerStatus, updateWorkerConfig } from "@/lib/api";
import { useToastStore } from "@/components/ui/toast";

interface WorkerConfig {
  id: string;
  type: "image" | "video" | "tts" | "social";
  status: "idle" | "running" | "paused" | "error";
  priority: number;
  currentJob?: string;
  processedCount: number;
  failedCount: number;
  lastActivity?: string;
}

interface WorkerState {
  workers: WorkerConfig[];
  priorityRules: Record<string, number>;
  parallelEnabled: boolean;
  maxConcurrent: number;
}

const WORKER_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  image: ImageIcon,
  video: Video,
  tts: AudioLines,
  social: Send,
};

const STATUS_COLORS: Record<string, string> = {
  idle: "text-muted",
  running: "text-success",
  paused: "text-warning",
  error: "text-red-400",
};

export function WorkerPanel() {
  const [state, setState] = useState<WorkerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchState = useCallback(async () => {
    const data = await getWorkerStatus();
    setState(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10_000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleWorkerAction = async (workerId: string, action: "pause" | "resume" | "reset") => {
    await updateWorkerConfig({ workerId, workerAction: action });
    addToast("success", `Worker ${action}d`);
    fetchState();
  };

  const toggleParallel = async () => {
    if (!state) return;
    await updateWorkerConfig({ parallelEnabled: !state.parallelEnabled });
    addToast("info", state.parallelEnabled ? "Sequential mode" : "Parallel mode enabled");
    fetchState();
  };

  const updateConcurrent = async (value: number) => {
    await updateWorkerConfig({ maxConcurrent: value });
    fetchState();
  };

  if (loading || !state) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-cyan" />
          <h3 className="text-xs font-semibold text-white">Workers</h3>
          <span className={clsx(
            "rounded-full px-1.5 py-0.5 text-[8px] font-medium",
            state.parallelEnabled ? "bg-success/10 text-success" : "bg-white/[0.06] text-muted"
          )}>
            {state.parallelEnabled ? "Parallel" : "Sequential"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleParallel}
            className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
            title={state.parallelEnabled ? "Switch to sequential" : "Enable parallel"}
          >
            <Zap size={12} />
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="rounded p-1 text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Worker settings"
          >
            <Settings2 size={12} />
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="border-b border-white/[0.06] px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted">Max concurrent workers</span>
            <select
              value={state.maxConcurrent}
              onChange={(e) => updateConcurrent(Number(e.target.value))}
              className="rounded bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[10px] text-muted outline-none"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="text-[9px] text-white/20">
            Priority: Chat (1) &rarr; Image (2) &rarr; Clip (3) &rarr; Lesson (4)
          </div>
        </div>
      )}

      {/* Worker list */}
      <div className="p-2 space-y-1">
        {state.workers.map((worker) => {
          const Icon = WORKER_ICONS[worker.type] || Cpu;
          return (
            <div
              key={worker.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03] transition-colors"
            >
              <Icon size={14} className={STATUS_COLORS[worker.status]} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-white capitalize">{worker.type}</span>
                  <span className={clsx("text-[9px] capitalize", STATUS_COLORS[worker.status])}>
                    {worker.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-white/20">
                  <span>{worker.processedCount} done</span>
                  {worker.failedCount > 0 && <span className="text-red-400">{worker.failedCount} failed</span>}
                  {worker.currentJob && <span className="text-cyan truncate">&rarr; {worker.currentJob}</span>}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {worker.status === "running" || worker.status === "idle" ? (
                  <button
                    onClick={() => handleWorkerAction(worker.id, "pause")}
                    className="rounded p-1 text-muted hover:text-warning hover:bg-warning/10 transition-colors"
                    title="Pause"
                  >
                    <Pause size={10} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleWorkerAction(worker.id, "resume")}
                    className="rounded p-1 text-muted hover:text-success hover:bg-success/10 transition-colors"
                    title="Resume"
                  >
                    <Play size={10} />
                  </button>
                )}
                <button
                  onClick={() => handleWorkerAction(worker.id, "reset")}
                  className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
