"use client";

import { useEffect, useState } from "react";
import { getLogs } from "@/lib/api";
import type { LogEntry } from "@/lib/types";
import {
  Terminal, FileText, Activity, Clock, HardDrive,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)}m ago`;
  const hrs = min / 60;
  return `${hrs.toFixed(1)}h ago`;
}

function LogFileCard({ log }: { log: LogEntry }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
        <FileText size={14} className="text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{log.name}</span>
          {log.likely_active && (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <Activity size={10} /> Active
            </span>
          )}
        </div>
        {log.exists && log.size_kb !== undefined && (
          <span className="text-[10px] text-muted font-mono">{log.size_kb.toFixed(1)} KB</span>
        )}
      </div>
      <div className="text-right shrink-0">
        {log.exists ? (
          <>
            {log.age_seconds !== undefined && (
              <span className="text-xs text-muted flex items-center gap-1">
                <Clock size={10} /> {formatAge(log.age_seconds)}
              </span>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted">
            <XCircle size={10} /> Not found
          </span>
        )}
      </div>
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLogs();
        setLogs(data.logs);
        setRecent(data.recent);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCount = logs.filter((l) => l.likely_active).length;
  const totalSizeKb = logs.reduce((sum, l) => sum + (l.size_kb ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Logs</h1>
          <p className="text-sm text-muted mt-1">
            {logs.length} log files &middot; {activeCount} active &middot; {(totalSizeKb / 1024).toFixed(1)} MB total
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-cyan" />
            <span className="text-xs text-muted">Log Files</span>
          </div>
          <p className="text-2xl font-bold text-white">{logs.filter((l) => l.exists).length}</p>
        </div>
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-success" />
            <span className="text-xs text-muted">Active</span>
          </div>
          <p className="text-2xl font-bold text-success">{activeCount}</p>
        </div>
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-amber" />
            <span className="text-xs text-muted">Total Size</span>
          </div>
          <p className="text-2xl font-bold text-white">{(totalSizeKb / 1024).toFixed(1)} MB</p>
        </div>
      </div>

      {/* Log Files */}
      <div className="glass p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Pipeline Logs</h3>
        <div className="space-y-1">
          {logs.map((log) => (
            <LogFileCard key={log.name} log={log} />
          ))}
          {loading && (
            <div className="py-8 text-center text-sm text-muted">Loading logs...</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
        <div className="space-y-1 font-mono text-xs max-h-[400px] overflow-y-auto">
          {recent.map((line, i) => (
            <div
              key={i}
              className={`rounded px-3 py-1.5 ${
                line.includes("ERROR") ? "bg-error/10 text-error" :
                line.includes("DONE") || line.includes("COMPLETE") ? "bg-success/10 text-success" :
                line.includes("Saved") ? "bg-cyan/5 text-cyan" :
                "bg-white/[0.02] text-muted"
              }`}
            >
              {line}
            </div>
          ))}
          {recent.length === 0 && !loading && (
            <div className="py-8 text-center text-muted">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
