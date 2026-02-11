"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import { formatDuration } from "@/lib/utils";
import type { RenderStats } from "@/lib/types";
import {
  CheckCircle2, Loader2, Film, Sparkles, Mic, Layers,
  Zap, Clock, HardDrive, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";

// ── Helpers ──────────────────────────────────────────

function buildChartData(stats: RenderStats | null) {
  if (!stats) return [];
  const map = new Map<string, { shot: string; v1: number; v2: number }>();
  for (const clip of stats.v1_renders.per_clip) {
    map.set(clip.shot_id, {
      shot: clip.shot_id.replace("P1_", ""),
      v1: Math.round((clip.render_seconds / 60) * 10) / 10,
      v2: 0,
    });
  }
  for (const clip of stats.v2_renders.per_clip) {
    const existing = map.get(clip.shot_id);
    if (existing) {
      existing.v2 = Math.round((clip.render_seconds / 60) * 10) / 10;
    } else {
      map.set(clip.shot_id, {
        shot: clip.shot_id.replace("P1_", ""),
        v1: 0,
        v2: Math.round((clip.render_seconds / 60) * 10) / 10,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.shot.localeCompare(b.shot));
}

// ── Sub-components ───────────────────────────────────

interface StatusCardProps {
  label: string;
  done: number;
  total: number;
  icon: React.ReactNode;
  color: string;
  status: "done" | "active" | "idle";
}

function StatusCard({ label, done, total, icon, color, status }: StatusCardProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="glass p-5 relative overflow-hidden group hover:border-white/[0.12] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {done}
            <span className="text-lg text-muted font-normal">/{total}</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {status === "done" ? (
              <CheckCircle2 size={14} className="text-success" />
            ) : status === "active" ? (
              <Loader2 size={14} className="text-cyan animate-spin" />
            ) : (
              <Clock size={14} className="text-muted" />
            )}
            <span
              className={`text-xs font-medium ${
                status === "done" ? "text-success" : status === "active" ? "text-cyan" : "text-muted"
              }`}
            >
              {status === "done" ? "Complete" : status === "active" ? "Rendering" : "Idle"}
            </span>
          </div>
        </div>
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
          </div>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-3 opacity-[0.04] transition-opacity group-hover:opacity-[0.08]">
        {icon}
      </div>
    </div>
  );
}

function PipelineBar({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-xs font-mono text-muted">{done}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
        />
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono text-white">{entry.value}m</span>
        </div>
      ))}
    </div>
  );
}

function FileSizeCard({ label, count, totalMb, avgKb, color }: {
  label: string; count: number; totalMb: number; avgKb: number; color: string;
}) {
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{totalMb.toFixed(1)} MB</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span>{count} files</span>
        <span className="text-white/20">|</span>
        <span>avg {avgKb.toFixed(0)} KB</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass p-5 h-32" />
        ))}
      </div>
      <div className="glass p-5 h-12" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass p-5 h-48 lg:col-span-2" />
        <div className="glass p-5 h-48" />
      </div>
      <div className="glass p-5 h-80" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────

export default function DashboardPage() {
  const { status, stats, isLoading, refreshAll } = useDashboardStore();

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  if (isLoading && !status) return <DashboardSkeleton />;

  const v1Done = status?.v1?.done ?? 0;
  const v1Total = status?.v1?.total ?? 25;
  const v2Done = status?.v2?.done ?? 0;
  const v2Total = status?.v2?.total ?? 25;
  const narDone = status?.audio_narrations ?? 0;
  const narTotal = status?.total_shots ?? 89;
  const compDone = status?.composite_clips ?? 0;

  const totalRenders = (stats?.v1_renders?.count ?? 0) + (stats?.v2_renders?.count ?? 0);
  const totalHours = (stats?.v1_renders?.total_hours ?? 0) + (stats?.v2_renders?.total_hours ?? 0);
  const avgSeconds = totalRenders > 0
    ? ((stats?.v1_renders?.total_seconds ?? 0) + (stats?.v2_renders?.total_seconds ?? 0)) / totalRenders
    : 0;
  const diskMb = (stats?.v1_file_sizes?.total_mb ?? 0) + (stats?.v2_file_sizes?.total_mb ?? 0) + (stats?.audio_file_sizes?.total_mb ?? 0);

  const chartData = buildChartData(stats);

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard label="V1 Standard" done={v1Done} total={v1Total} color="#3b82f6"
          status={v1Done >= v1Total ? "done" : "active"} icon={<Film size={64} />} />
        <StatusCard label="V2 Enhanced" done={v2Done} total={v2Total} color="#00d4ff"
          status={v2Done < v2Total ? "active" : "done"} icon={<Sparkles size={64} />} />
        <StatusCard label="Narration" done={narDone} total={narTotal} color="#22c55e"
          status={narDone >= narTotal ? "done" : "idle"} icon={<Mic size={64} />} />
        <StatusCard label="Composite" done={compDone} total={v1Total} color="#f59e0b"
          status={compDone >= v1Total ? "done" : "idle"} icon={<Layers size={64} />} />
      </div>

      {/* Currently Rendering */}
      {stats?.currently_rendering && (
        <div className="glass glow-cyan p-4 flex items-center gap-4">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-white">Active Render</span>
            <code className="rounded bg-white/[0.06] px-2 py-0.5 text-sm font-mono text-cyan">
              {stats.currently_rendering.shot_id}
            </code>
            <span className="rounded bg-cyan/10 px-2 py-0.5 text-xs font-semibold text-cyan uppercase">
              {stats.currently_rendering.phase}
            </span>
            <span className="text-xs text-muted">
              Queued at {stats.currently_rendering.queued_at}
            </span>
          </div>
        </div>
      )}

      {/* Pipeline Progress + Production Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-5">Pipeline Progress</h3>
          <div className="space-y-5">
            <PipelineBar label="V1 Standard" done={v1Done} total={v1Total} color="#3b82f6" />
            <PipelineBar label="V2 Enhanced" done={v2Done} total={v2Total} color="#00d4ff" />
            <PipelineBar label="Narration" done={narDone} total={narTotal} color="#22c55e" />
            <PipelineBar label="Composite" done={compDone} total={v1Total} color="#f59e0b" />
          </div>
        </div>
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-5">Production Stats</h3>
          <div className="space-y-1">
            <StatRow icon={<Zap size={14} className="text-cyan" />} label="Total Renders" value={`${totalRenders}`} />
            <StatRow icon={<Clock size={14} className="text-amber" />} label="Total Hours" value={`${totalHours.toFixed(1)}h`} />
            <StatRow icon={<TrendingUp size={14} className="text-success" />} label="Avg / Clip" value={formatDuration(avgSeconds)} />
            <StatRow icon={<HardDrive size={14} className="text-violet-400" />} label="Disk Usage" value={`${diskMb.toFixed(1)} MB`} />
          </div>
        </div>
      </div>

      {/* Render Performance Chart */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Render Performance</h3>
          <span className="text-xs text-muted">Per-clip render time (minutes)</span>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="shot"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar dataKey="v1" name="V1 Standard" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="v2" name="V2 Enhanced" fill="#00d4ff" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* File Size Comparison */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FileSizeCard label="V1 Standard"
          count={stats?.v1_file_sizes?.count ?? 0}
          totalMb={stats?.v1_file_sizes?.total_mb ?? 0}
          avgKb={stats?.v1_file_sizes?.avg_kb ?? 0}
          color="#3b82f6" />
        <FileSizeCard label="V2 Enhanced"
          count={stats?.v2_file_sizes?.count ?? 0}
          totalMb={stats?.v2_file_sizes?.total_mb ?? 0}
          avgKb={stats?.v2_file_sizes?.avg_kb ?? 0}
          color="#00d4ff" />
        <FileSizeCard label="Audio Narrations"
          count={stats?.audio_file_sizes?.count ?? 0}
          totalMb={stats?.audio_file_sizes?.total_mb ?? 0}
          avgKb={stats?.audio_file_sizes?.avg_kb ?? 0}
          color="#22c55e" />
      </div>
    </div>
  );
}
