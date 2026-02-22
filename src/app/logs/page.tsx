"use client";

import { useEffect, useState } from "react";
import { getLogs } from "@/lib/api";
import type { LogEntry } from "@/lib/types";
import {
  Terminal, FileText, Activity, Clock, HardDrive,
  XCircle, RefreshCw, Search, AlertTriangle, CheckCircle2, Trash2,
} from "lucide-react";
import { LogsSkeleton } from "@/components/ui/skeleton";
import { useErrorTracker, type ErrorSeverity } from "@/lib/error-tracker";

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

// ── Severity styling helpers ──────────────────────────────────────

const SEVERITY_STYLES: Record<ErrorSeverity, { text: string; bg: string; label: string }> = {
  critical: { text: "text-red-400", bg: "bg-red-400/10", label: "Critical" },
  high:     { text: "text-orange-400", bg: "bg-orange-400/10", label: "High" },
  medium:   { text: "text-warning", bg: "bg-warning/10", label: "Medium" },
  low:      { text: "text-muted", bg: "bg-white/[0.06]", label: "Low" },
};

const CATEGORY_STYLES: Record<string, string> = {
  network:      "bg-blue-400/10 text-blue-400 border-blue-400/20",
  automation:   "bg-cyan/10 text-cyan border-cyan/20",
  generation:   "bg-purple-400/10 text-purple-400 border-purple-400/20",
  distribution: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  system:       "bg-white/[0.06] text-muted border-white/[0.08]",
};

function ErrorsPanel() {
  const { errors, resolveError, clearResolved, clearAll } = useErrorTracker();
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = errors.filter((e) => {
    if (severityFilter !== "all" && e.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    return true;
  });

  const unresolvedCount = errors.filter((e) => !e.resolved).length;
  const resolvedCount = errors.filter((e) => e.resolved).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
              <AlertTriangle size={14} className="text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white number-pop">{unresolvedCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Unresolved</p>
        </div>
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 size={14} className="text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-success number-pop">{resolvedCount}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Resolved</p>
        </div>
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
              <XCircle size={14} className="text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-400 number-pop">
            {errors.filter((e) => e.severity === "critical" && !e.resolved).length}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Critical</p>
        </div>
        <div className="glass stat-card p-4 group">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10">
              <Activity size={14} className="text-cyan" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white number-pop">{errors.length}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Total Tracked</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Severity filter */}
        <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
          {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                severityFilter === s ? "filter-active" : "text-muted hover:text-white"
              }`}
            >
              {s === "all" ? "All" : SEVERITY_STYLES[s].label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-muted outline-none"
        >
          <option value="all">All Categories</option>
          <option value="network">Network</option>
          <option value="automation">Automation</option>
          <option value="generation">Generation</option>
          <option value="distribution">Distribution</option>
          <option value="system">System</option>
        </select>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {resolvedCount > 0 && (
            <button
              onClick={clearResolved}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-all"
            >
              <Trash2 size={12} /> Clear Resolved
            </button>
          )}
          {errors.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg bg-red-400/10 border border-red-400/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/20 transition-all"
            >
              <Trash2 size={12} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Error List */}
      <div className="glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-red-400" />
          <h3 className="text-sm font-semibold text-white section-heading">Tracked Errors</h3>
          <span className="text-[10px] text-muted ml-auto">{filtered.length} shown</span>
        </div>
        <div className="space-y-1.5 stagger-list">
          {filtered.map((error) => {
            const sev = SEVERITY_STYLES[error.severity];
            const catStyle = CATEGORY_STYLES[error.category] ?? CATEGORY_STYLES.system;

            return (
              <div
                key={error.id}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 transition-all ${
                  error.resolved
                    ? "bg-white/[0.01] border border-transparent opacity-50"
                    : `${sev.bg} border border-transparent`
                }`}
              >
                {/* Severity indicator */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${sev.bg}`}>
                  <AlertTriangle size={14} className={sev.text} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${error.resolved ? "text-muted line-through" : "text-white"}`}>
                      {error.message}
                    </span>
                    {/* Severity badge */}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.text} ${sev.bg} border border-current/20`}>
                      {sev.label}
                    </span>
                    {/* Category badge */}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${catStyle}`}>
                      {error.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted font-mono">{error.source}</span>
                    <span className="text-[10px] text-white/20">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {error.details && (
                    <p className="text-[10px] text-muted font-mono mt-1 bg-white/[0.02] rounded px-2 py-1 break-all">
                      {error.details}
                    </p>
                  )}
                </div>

                {/* Resolve button */}
                <div className="shrink-0">
                  {!error.resolved ? (
                    <button
                      onClick={() => resolveError(error.id)}
                      className="flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1.5 text-[10px] text-muted hover:text-success hover:border-success/20 transition-all"
                    >
                      <CheckCircle2 size={10} /> Resolve
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-success/50">
                      <CheckCircle2 size={10} /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">
              {errors.length === 0 ? "No errors tracked yet" : "No errors match the current filter"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type PageTab = "logs" | "errors";
type LogFilter = "all" | "active" | "exists" | "missing";

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PageTab>("logs");
  const unresolvedErrorCount = useErrorTracker((s) => s.errors.filter((e) => !e.resolved).length);

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

      {/* Tab Switcher */}
      <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5 w-fit">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-all ${
            activeTab === "logs" ? "filter-active" : "text-muted hover:text-white"
          }`}
        >
          <Terminal size={12} />
          Logs
        </button>
        <button
          onClick={() => setActiveTab("errors")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-all ${
            activeTab === "errors" ? "filter-active" : "text-muted hover:text-white"
          }`}
        >
          <AlertTriangle size={12} />
          Errors
          {unresolvedErrorCount > 0 && (
            <span className="flex items-center justify-center rounded-full bg-red-400/15 px-1.5 min-w-[18px] h-[18px] text-[10px] font-bold text-red-400 border border-red-400/20">
              {unresolvedErrorCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "logs" ? (
        <>
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
            <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
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
        </>
      ) : (
        <ErrorsPanel />
      )}
    </div>
  );
}
