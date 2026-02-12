"use client";

import { useEffect, useState } from "react";
import { getLogs } from "@/lib/api";
import type { LogEntry } from "@/lib/types";
import {
  Terminal, FileText, Activity, Clock, HardDrive,
  XCircle, RefreshCw, Search,
} from "lucide-react";
import { LogsSkeleton } from "@/components/ui/skeleton";

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)}m ago`;
  const hrs = min / 60;
  return `${hrs.toFixed(1)}h ago`;
}

function LogFileCard({ log }: { log: LogEntry }) {
  const isRecent = log.age_seconds !== undefined && log.age_seconds < 300;

  return (
    <div className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all cursor-pointer
      ${log.likely_active ? "bg-cyan/[0.04] border border-cyan/10 hover:border-cyan/20" :
        log.exists ? "bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/[0.08]" :
        "bg-white/[0.01] border border-transparent opacity-50"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        log.likely_active ? "bg-cyan/10" : log.exists ? "bg-white/[0.04]" : "bg-white/[0.02]"
      }`}>
        {log.likely_active ? (
          <Activity size={14} className="text-cyan" />
        ) : log.exists ? (
          <FileText size={14} className="text-muted" />
        ) : (
          <XCircle size={14} className="text-white/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{log.name}</span>
          {log.likely_active && (
            <span className="flex items-center gap-1 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-cyan border border-cyan/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan" />
              </span>
              Active
            </span>
          )}
          {isRecent && !log.likely_active && (
            <span className="text-[10px] text-success font-medium">Recent</span>
          )}
        </div>
        {log.exists && log.size_kb !== undefined && (
          <span className="text-[10px] text-muted font-mono mt-0.5 block">
            {log.size_kb < 1 ? `${(log.size_kb * 1024).toFixed(0)} B` : `${log.size_kb.toFixed(1)} KB`}
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        {log.exists ? (
          log.age_seconds !== undefined && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock size={10} /> {formatAge(log.age_seconds)}
            </span>
          )
        ) : (
          <span className="flex items-center gap-1 text-xs text-white/20">
            <XCircle size={10} /> Missing
          </span>
        )}
      </div>
    </div>
  );
}

type LogFilter = "all" | "active" | "exists" | "missing";

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
  const existsCount = logs.filter((l) => l.exists).length;
  const totalSizeKb = logs.reduce((sum, l) => sum + (l.size_kb ?? 0), 0);

  const filteredLogs = logs.filter((log) => {
    if (searchQuery && !log.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === "active") return log.likely_active;
    if (filter === "exists") return log.exists;
    if (filter === "missing") return !log.exists;
    return true;
  });

  if (loading && logs.length === 0) return <LogsSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal size={20} className="text-cyan" />
            Pipeline Logs
          </h1>
          <p className="text-sm text-muted mt-1">
            {logs.length} log files tracked
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            getLogs().then((data) => {
              setLogs(data.logs);
              setRecent(data.recent);
            }).catch(() => {}).finally(() => setLoading(false));
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-muted hover:text-cyan hover:border-cyan/20 transition-all"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10">
              <FileText size={14} className="text-cyan" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white number-pop">{existsCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Log Files</p>
        </div>
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <Activity size={14} className="text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-success number-pop">{activeCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Active</p>
        </div>
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error/10">
              <XCircle size={14} className="text-error" />
            </div>
          </div>
          <p className="text-2xl font-bold text-error number-pop">{logs.length - existsCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Missing</p>
        </div>
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10">
              <HardDrive size={14} className="text-amber" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white number-pop">{(totalSizeKb / 1024).toFixed(1)}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">MB Total</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5">
          {(["all", "active", "exists", "missing"] as LogFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f ? "filter-active" : "text-muted hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : f === "exists" ? "Exists" : "Missing"}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-44"
          />
        </div>
      </div>

      {/* Log Files */}
      <div className="glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={14} className="text-cyan" />
          <h3 className="text-sm font-semibold text-white section-heading">Log Files</h3>
          <span className="text-[10px] text-muted ml-auto">{filteredLogs.length} shown</span>
        </div>
        <div className="space-y-1.5 stagger-list">
          {filteredLogs.map((log) => (
            <LogFileCard key={log.name} log={log} />
          ))}
          {loading && filteredLogs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted animate-pulse">Loading logs...</div>
          )}
          {filteredLogs.length === 0 && !loading && (
            <div className="py-8 text-center text-sm text-muted">No logs match the current filter</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-success" />
          <h3 className="text-sm font-semibold text-white section-heading">Recent Activity</h3>
          <span className="text-[10px] text-muted ml-auto">{recent.length} entries</span>
        </div>
        <div className="space-y-1 font-mono text-xs max-h-[400px] overflow-y-auto stagger-list">
          {recent.map((line, i) => (
            <div
              key={i}
              className={`rounded px-3 py-1.5 flex items-start gap-2 ${
                line.includes("ERROR") ? "bg-error/10 text-error" :
                line.includes("DONE") || line.includes("COMPLETE") ? "bg-success/10 text-success" :
                line.includes("Saved") ? "bg-cyan/5 text-cyan" :
                line.includes("Queued") || line.includes("Seed") ? "bg-white/[0.02] text-white/60" :
                "bg-white/[0.02] text-muted"
              }`}
            >
              <span className="shrink-0 text-white/20 select-none w-4 text-right">{i + 1}</span>
              <span className="break-all">{line}</span>
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
