"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDashboardStore } from "@/lib/store";
import { formatDuration, getSceneColor } from "@/lib/utils";
import { getLogs, getWhatsAppJobs } from "@/lib/api";
import type { RenderStats } from "@/lib/types";
import Link from "next/link";
import {
  Film, Layers,
  Zap, Clock, HardDrive, TrendingUp, Sun, Moon, Sunset,
  Play, FolderOpen, FileText, Search, Activity,
  Gauge, Lightbulb, ArrowUpRight, Flame,
  Monitor, Image as ImageIcon, Video, BookOpen,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Maximize2,
} from "lucide-react";
import { QuickNotes } from "@/components/ui/quick-notes";
import { Confetti } from "@/components/ui/confetti";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";

// ── Helpers ──────────────────────────────────────────

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", icon: Sun };
  if (h < 17) return { text: "Good afternoon", icon: Sunset };
  return { text: "Good evening", icon: Moon };
}

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

function GreetingBanner({ v1Done, v2Done, narDone, v1Total, v2Total, narTotal }: {
  v1Done: number; v2Done: number; narDone: number;
  v1Total: number; v2Total: number; narTotal: number;
}) {
  const { text, icon: Icon } = getGreeting();
  const totalDone = v1Done + v2Done + narDone;
  const totalAll = v1Total + v2Total + narTotal;
  const healthPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="glass glow-cyan border-shimmer p-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
            <Icon size={20} className="text-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{text}</h1>
            <p className="text-xs text-muted">The Mole World — Chapter 1 Production</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="text-center">
            <p className="text-lg font-bold text-success number-pop">{totalDone}</p>
            <p className="text-muted">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber number-pop">{totalAll - totalDone}</p>
            <p className="text-muted">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan number-pop">{healthPct}%</p>
            <p className="text-muted">Health</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverallProgressRing({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="glass p-6 flex flex-col items-center justify-center">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Overall Progress</h3>
      <div className="relative scale-in">
        <svg className="progress-ring active" width="140" height="140" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="url(#cyanGrad)"
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1.2s ease" }}
          />
          <defs>
            <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--cyan)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-cyan text-glow-cyan">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function PhaseCard({ label, done, total, color, status }: {
  label: string; done: number; total: number; color: string;
  status: "done" | "active" | "idle";
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (pct / 100) * circumference;
  const glowClass = status === "active" ? (color === "#ff6b35" ? "glow-amber" : "glow-cyan") : "";
  const breatheClass = status === "active" ? "glass-breathe" : "";

  return (
    <div className={`glass p-5 ${glowClass} ${breatheClass} transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {status === "done" ? (
              <span className="status-dot done" />
            ) : status === "active" ? (
              <span className="status-dot running" />
            ) : (
              <span className="status-dot idle" />
            )}
            <span className={`text-[10px] font-semibold uppercase ${
              status === "done" ? "text-success" : status === "active" ? "text-cyan" : "text-muted"
            }`}>
              {status === "done" ? "Complete" : status === "active" ? "Rendering" : "Pending"}
            </span>
          </div>
        </div>
        <div className="relative h-12 w-12 shrink-0">
          <svg className={`h-12 w-12 ${status === "active" ? "progress-ring active" : ""}`} viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle
              cx="26" cy="26" r="22" fill="none"
              stroke={color}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>
          </div>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-mono text-muted">{done}/{total} clips</span>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "Preview", icon: Play, href: "/compose" },
    { label: "Compose", icon: Layers, href: "/compose" },
    { label: "Clips", icon: Film, href: "/clips" },
    { label: "Logs", icon: FileText, href: "/logs" },
    { label: "Storyboard", icon: FolderOpen, href: "/storyboard" },
    { label: "Search", icon: Search, href: "#", onClick: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true })) },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {actions.map((a) => (
        <Link key={a.label} href={a.href} className="quick-action-btn">
          <a.icon size={18} />
          <span className="text-xs font-medium">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

function GpuStatsWidget() {
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={14} className="text-cyan" />
        <h3 className="text-sm font-semibold text-white section-heading">GPU Stats</h3>
        <span className="ml-auto text-[10px] text-success font-semibold uppercase">Online</span>
      </div>
      <div className="space-y-3">
        {[
          { label: "VRAM Usage", value: 78, max: "16 GB", color: "var(--cyan)" },
          { label: "GPU Utilization", value: 92, max: "100%", color: "#22c55e" },
          { label: "Temperature", value: 68, max: "90\u00b0C", color: value68Color(68) },
          { label: "Power Draw", value: 85, max: "450W", color: "#f59e0b" },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted">{stat.label}</span>
              <span className="font-mono" style={{ color: stat.color }}>{stat.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${stat.value}%`, background: stat.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted border-t border-white/[0.04] pt-3">
        <span>RTX 4090</span>
        <span className="text-white/20">|</span>
        <span>CUDA 12.x</span>
        <span className="text-white/20">|</span>
        <span>16 GB VRAM</span>
      </div>
    </div>
  );
}

function value68Color(temp: number): string {
  if (temp < 60) return "#22c55e";
  if (temp < 80) return "#f59e0b";
  return "#ef4444";
}

function RenderQueueWidget({ stats }: { stats: RenderStats | null }) {
  const queue = [
    { shot: "P1_S04_001", phase: "v2", priority: "high" },
    { shot: "P1_S04_002", phase: "v2", priority: "normal" },
    { shot: "P1_S05_001", phase: "v2", priority: "normal" },
    { shot: "P1_S05_002", phase: "v2", priority: "low" },
  ];

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-amber" />
        <h3 className="text-sm font-semibold text-white section-heading">Render Queue</h3>
        <span className="ml-auto badge badge-v2">{queue.length} queued</span>
      </div>
      <div className="space-y-1.5 stagger-list">
        {queue.map((item, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 row-hover">
            <span className="text-xs text-muted font-mono w-4">{i + 1}</span>
            <code className="text-xs font-mono text-white flex-1">{item.shot}</code>
            <span className="badge badge-v2">{item.phase}</span>
            <span className={`text-[9px] font-semibold uppercase ${
              item.priority === "high" ? "text-error" :
              item.priority === "normal" ? "text-cyan" : "text-muted"
            }`}>
              {item.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductionSummary({ totalRenders, totalHours, avgSeconds, diskMb }: {
  totalRenders: number; totalHours: number; avgSeconds: number; diskMb: number;
}) {
  const items = [
    { label: "Total Renders", value: `${totalRenders}`, icon: <Zap size={18} className="text-cyan" />, color: "var(--cyan)" },
    { label: "Render Time", value: `${totalHours.toFixed(1)}h`, icon: <Clock size={18} className="text-amber" />, color: "#ff6b35" },
    { label: "Avg Per Clip", value: formatDuration(avgSeconds), icon: <TrendingUp size={18} className="text-success" />, color: "#22c55e" },
    { label: "Disk Usage", value: `${diskMb.toFixed(1)} MB`, icon: <HardDrive size={18} className="text-violet-400" />, color: "#8b5cf6" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="glass stat-card p-4 group">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
              {item.icon}
            </div>
            <div>
              <p className="text-xs text-muted">{item.label}</p>
              <p className="text-lg font-bold text-white number-pop">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono text-sm text-cyan tabular-nums">
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

function CurrentlyRendering({ shot_id, phase, queued_at }: { shot_id: string; phase: string; queued_at: string }) {
  return (
    <div className="glass glow-cyan glass-breathe p-4 flex items-center gap-4 flex-wrap">
      <div className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-cyan">Rendering</span>
      <code className="rounded bg-white/[0.06] px-2.5 py-1 text-sm font-mono text-cyan">{shot_id}</code>
      <span className="badge badge-v2">{phase}</span>
      {/* Heartbeat SVG */}
      <svg width="60" height="24" viewBox="0 0 60 24" className="text-cyan opacity-60 heartbeat">
        <polyline
          fill="none" stroke="currentColor" strokeWidth="1.5"
          points="0,12 10,12 15,4 20,20 25,8 30,16 35,12 60,12"
          className="pulse-glow"
        />
      </svg>
      <div className="ml-auto flex items-center gap-3">
        <LiveTimer />
        <span className="text-xs text-muted">Queued {queued_at}</span>
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
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
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

function ShotMap({ clips }: { clips: { shot_id: string; scene_id: string; has_clip: boolean }[] }) {
  return (
    <div className="glass p-5">
      <h3 className="text-sm font-semibold text-white mb-3 section-heading">Shot Map</h3>
      <div className="flex flex-wrap gap-1.5">
        {clips.map((c) => (
          <div
            key={c.shot_id}
            className="h-3 w-3 rounded-sm transition-all hover:scale-150 cursor-pointer"
            style={{
              background: c.has_clip ? getSceneColor(c.scene_id) : "rgba(255,255,255,0.08)",
              opacity: c.has_clip ? 1 : 0.4,
            }}
            title={c.shot_id}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> Done</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-white/[0.08]" /> Pending</span>
      </div>
    </div>
  );
}

function FilmTimeline({ clips }: { clips: { shot_id: string; scene_id: string; has_clip: boolean }[] }) {
  return (
    <div className="glass p-5">
      <h3 className="text-sm font-semibold text-white mb-3 section-heading">Film Timeline</h3>
      <div className="flex gap-0.5 h-10 items-end">
        {clips.map((c) => (
          <div
            key={c.shot_id}
            className="flex-1 rounded-sm transition-all hover:opacity-100 hover:scale-y-110 relative group"
            style={{
              background: c.has_clip ? getSceneColor(c.scene_id) : "rgba(255,255,255,0.06)",
              height: c.has_clip ? "100%" : "40%",
              opacity: c.has_clip ? 0.8 : 0.3,
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
              <span className="text-[9px] font-mono text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                {c.shot_id.replace("P1_", "")}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {Array.from(new Set(clips.map((c) => c.scene_id))).sort().map((sceneId) => (
          <span key={sceneId} className="flex items-center gap-1 text-[10px] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: getSceneColor(sceneId) }} />
            {sceneId}
          </span>
        ))}
      </div>
    </div>
  );
}

function PipelineHealthGauge({ v1Pct, v2Pct, narPct }: { v1Pct: number; v2Pct: number; narPct: number }) {
  const completion = Math.round((v1Pct + v2Pct + narPct) / 3);
  const speed = 78;
  const consistency = 85;
  const overall = Math.round((completion + speed + consistency) / 3);
  const color = overall >= 80 ? "#22c55e" : overall >= 50 ? "#eab308" : "#ef4444";

  const r = 40;
  const circ = Math.PI * r;
  const offset = circ - (overall / 100) * circ;

  return (
    <div className="glass p-5">
      <h3 className="text-sm font-semibold text-white mb-4 section-heading">Pipeline Health</h3>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <svg width="100" height="56" viewBox="0 0 100 56">
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round"
            />
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <span className="text-xl font-bold" style={{ color }}>{overall}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {[
            { label: "Completion", value: completion, color: "#22c55e" },
            { label: "Speed", value: speed, color: "var(--cyan)" },
            { label: "Consistency", value: consistency, color: "#8b5cf6" },
          ].map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted">{f.label}</span>
                <span style={{ color: f.color }}>{f.value}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.value}%`, background: f.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneBreakdown({ clips }: { clips: { scene_id: string; has_clip: boolean }[] }) {
  const sceneMap = new Map<string, { total: number; done: number }>();
  for (const c of clips) {
    const s = sceneMap.get(c.scene_id) ?? { total: 0, done: 0 };
    s.total++;
    if (c.has_clip) s.done++;
    sceneMap.set(c.scene_id, s);
  }
  const scenes = Array.from(sceneMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="glass p-5">
      <h3 className="text-sm font-semibold text-white mb-3 section-heading">Scene Breakdown</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {scenes.map(([sceneId, { total, done }]) => {
          const pct = Math.round((done / total) * 100);
          const r = 14;
          const circ = 2 * Math.PI * r;
          const off = circ - (pct / 100) * circ;
          return (
            <div key={sceneId} className="flex flex-col items-center gap-1 hover-lift cursor-pointer">
              <div className="relative">
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r={r} fill="none"
                    stroke={getSceneColor(sceneId)} strokeWidth="2.5"
                    strokeDasharray={circ} strokeDashoffset={off}
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">{done}/{total}</span>
                </div>
              </div>
              <span className="text-[9px] text-muted font-mono">{sceneId.replace("P1_", "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductionMilestones({ v1Done, v2Done, narDone, v1Total, v2Total }: {
  v1Done: number; v2Done: number; narDone: number; v1Total: number; v2Total: number;
}) {
  const milestones = [
    { label: "V1 Start", reached: v1Done > 0 },
    { label: "V1 50%", reached: v1Done >= Math.ceil(v1Total / 2) },
    { label: "V1 Done", reached: v1Done >= v1Total },
    { label: "V2 Start", reached: v2Done > 0 },
    { label: "V2 50%", reached: v2Done >= Math.ceil(v2Total / 2) },
    { label: "Narration", reached: narDone > 0 },
    { label: "Final Cut", reached: false },
  ];
  const reachedCount = milestones.filter((m) => m.reached).length;
  const pct = (reachedCount / milestones.length) * 100;

  return (
    <div className="glass p-5">
      <h3 className="text-sm font-semibold text-white mb-4 section-heading">Production Milestones</h3>
      <div className="relative">
        <div className="h-1 bg-white/[0.06] rounded-full">
          <div className="h-full bg-cyan rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          {milestones.map((m, i) => (
            <div key={i} className="flex flex-col items-center" style={{ width: `${100 / milestones.length}%` }}>
              <div className={`h-3 w-3 rounded-full border-2 -mt-4 mb-1 ${
                m.reached ? "bg-cyan border-cyan" : "bg-transparent border-white/20"
              }`} />
              <span className={`text-[8px] text-center leading-tight ${m.reached ? "text-cyan" : "text-muted"}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ entries }: { entries: string[] }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-cyan" />
        <h3 className="text-sm font-semibold text-white section-heading">Activity Feed</h3>
      </div>
      <div className="space-y-1 font-mono text-xs max-h-[240px] overflow-y-auto stagger-list">
        {entries.slice(0, 12).map((line, i) => (
          <div
            key={i}
            className={`rounded px-3 py-1.5 ${
              line.includes("ERROR") ? "bg-error/10 text-error" :
              line.includes("DONE") || line.includes("COMPLETE") ? "bg-success/10 text-success" :
              line.includes("Saved") ? "bg-cyan/5 text-cyan" :
              line.includes("Queued") || line.includes("Seed") ? "bg-white/[0.02] text-white/60" :
              "bg-white/[0.02] text-muted"
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string;
}) {
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

function PipelineInsights({ v1Done, v2Done, narDone, v1Total, v2Total, narTotal }: {
  v1Done: number; v2Done: number; narDone: number;
  v1Total: number; v2Total: number; narTotal: number;
}) {
  const insights = [];

  if (v1Done >= v1Total) {
    insights.push({ type: "success" as const, text: "V1 renders complete! All standard clips are ready for review." });
  } else if (v1Done > v1Total * 0.8) {
    insights.push({ type: "info" as const, text: `V1 nearly done — only ${v1Total - v1Done} clips remaining.` });
  }

  if (v2Done > 0 && v2Done < v2Total) {
    const eta = Math.round(((v2Total - v2Done) / Math.max(v2Done, 1)) * 2.5);
    insights.push({ type: "info" as const, text: `V2 enhancement at ${Math.round((v2Done / v2Total) * 100)}%. Estimated ${eta}h to completion at current rate.` });
  }

  if (narDone >= narTotal && narTotal > 0) {
    insights.push({ type: "success" as const, text: "All narration audio generated. Ready for composition." });
  } else if (narDone > 0) {
    insights.push({ type: "info" as const, text: `${narTotal - narDone} narration clips still need generation.` });
  }

  if (v1Done >= v1Total && v2Done >= v2Total && narDone >= narTotal) {
    insights.push({ type: "success" as const, text: "All pipeline phases complete! Head to Compose to stitch the final film." });
  } else {
    const bottleneck = v2Done / Math.max(v2Total, 1) < v1Done / Math.max(v1Total, 1)
      ? "V2 Enhanced" : "Narration";
    insights.push({ type: "warning" as const, text: `Bottleneck detected: ${bottleneck} phase is behind schedule.` });
  }

  const colors = {
    success: { bg: "bg-success/[0.06]", border: "border-success/20", icon: "text-success" },
    info: { bg: "bg-cyan/[0.06]", border: "border-cyan/20", icon: "text-cyan" },
    warning: { bg: "bg-warning/[0.06]", border: "border-warning/20", icon: "text-warning" },
  };

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={14} className="text-warning" />
        <h3 className="text-sm font-semibold text-white section-heading">Pipeline Insights</h3>
        <span className="ml-auto text-[10px] text-muted">AI Analysis</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const c = colors[insight.type];
          return (
            <div
              key={i}
              className={`insight-card flex items-start gap-2.5 rounded-lg ${c.bg} border ${c.border} px-3 py-2.5`}
            >
              <ArrowUpRight size={12} className={`${c.icon} mt-0.5 shrink-0`} />
              <p className="text-xs text-white/80 leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function V2EnhancementTracker({ clips }: { clips: { shot_id: string; scene_id: string; has_clip: boolean; clip?: { source: string } | null }[] }) {
  const v1Clips = clips.filter((c) => c.clip?.source === "v1");
  const v2Clips = clips.filter((c) => c.clip?.source === "v2");
  const total = clips.length;
  const v1Count = v1Clips.length;
  const v2Count = v2Clips.length;
  const pendingCount = total - v1Count - v2Count;

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={14} className="text-amber" />
        <h3 className="text-sm font-semibold text-white section-heading">V2 Enhancement Tracker</h3>
      </div>

      {/* Stacked bar */}
      <div className="h-6 flex rounded-full overflow-hidden bg-white/[0.04] mb-3">
        {v2Count > 0 && (
          <div
            className="h-full bg-gradient-to-r from-amber to-amber/70 transition-all duration-1000 flex items-center justify-center"
            style={{ width: `${(v2Count / total) * 100}%` }}
          >
            {v2Count > 3 && <span className="text-[9px] font-bold text-black">{v2Count} V2</span>}
          </div>
        )}
        {v1Count > 0 && (
          <div
            className="h-full bg-blue-500/60 transition-all duration-1000 flex items-center justify-center"
            style={{ width: `${(v1Count / total) * 100}%` }}
          >
            {v1Count > 3 && <span className="text-[9px] font-bold text-white">{v1Count} V1</span>}
          </div>
        )}
        {pendingCount > 0 && (
          <div
            className="h-full bg-white/[0.06] transition-all duration-1000 flex items-center justify-center"
            style={{ width: `${(pendingCount / total) * 100}%` }}
          >
            {pendingCount > 3 && <span className="text-[9px] font-medium text-muted">{pendingCount}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-amber to-amber/70" />
            <span className="text-muted">V2 Enhanced</span>
            <span className="font-mono text-white">{v2Count}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500/60" />
            <span className="text-muted">V1 Only</span>
            <span className="font-mono text-white">{v1Count}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.06]" />
            <span className="text-muted">Pending</span>
            <span className="font-mono text-white">{pendingCount}</span>
          </span>
        </div>
        <span className="font-mono text-amber font-semibold">
          {total > 0 ? Math.round((v2Count / total) * 100) : 0}%
        </span>
      </div>
    </div>
  );
}

function RenderHeatmap({ stats }: { stats: RenderStats | null }) {
  // Build a 7x4 grid representing last 28 render sessions
  const cells: { intensity: number; label: string }[] = [];
  const allClips = [
    ...(stats?.v1_renders?.per_clip ?? []),
    ...(stats?.v2_renders?.per_clip ?? []),
  ];
  const maxTime = Math.max(...allClips.map((c) => c.render_seconds), 1);

  for (let i = 0; i < 28; i++) {
    if (i < allClips.length) {
      const clip = allClips[i];
      cells.push({
        intensity: clip.render_seconds / maxTime,
        label: `${clip.shot_id}: ${formatDuration(clip.render_seconds)}`,
      });
    } else {
      cells.push({ intensity: 0, label: "No render" });
    }
  }

  const getColor = (intensity: number): string => {
    if (intensity === 0) return "rgba(255,255,255,0.04)";
    if (intensity < 0.25) return "color-mix(in srgb, var(--cyan) 15%, transparent)";
    if (intensity < 0.5) return "color-mix(in srgb, var(--cyan) 30%, transparent)";
    if (intensity < 0.75) return "color-mix(in srgb, var(--cyan) 50%, transparent)";
    return "color-mix(in srgb, var(--cyan) 75%, transparent)";
  };

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-cyan" />
        <h3 className="text-sm font-semibold text-white section-heading">Render Heatmap</h3>
        <span className="ml-auto text-[10px] text-muted">By render duration</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm transition-all hover:scale-125 hover:ring-1 hover:ring-cyan/30 cursor-pointer group relative"
            style={{ background: getColor(cell.intensity) }}
            title={cell.label}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-black/90 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
              {cell.label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
        <span>Less</span>
        {[0, 0.15, 0.3, 0.5, 0.75].map((v) => (
          <div key={v} className="h-3 w-3 rounded-sm" style={{ background: getColor(v) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="glass p-5 h-20" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="glass p-5 h-32" />)}
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

// ── Higgs Tab Types ──────────────────────────────────

interface HiggsJob {
  id: string;
  type: string;
  description: string;
  enhancedPrompt: string | null;
  status: string;
  outputPaths: string[];
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

type DashboardTab = "local" | "higgs";
type HiggsFilter = "all" | "image" | "clip" | "lesson" | "news-content";

function mediaUrl(outputPath: string): string {
  const filename = outputPath.split("/").pop() ?? "";
  return `/api/whatsapp/media?file=${encodeURIComponent(filename)}`;
}

function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function HiggsCard({ job, typeColors, typeLabels, expandedJob, onToggle }: {
  job: HiggsJob;
  typeColors: Record<string, string>;
  typeLabels: Record<string, string>;
  expandedJob: string | null;
  onToggle: (id: string | null) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isExpanded = expandedJob === job.id;
  const hasOutput = job.outputPaths.length > 0;
  const firstOutput = hasOutput ? job.outputPaths[0] : null;
  const isVideo = firstOutput?.endsWith(".mp4") ?? false;
  const color = typeColors[job.type] ?? "#6b7280";

  useEffect(() => {
    if (!isVideo) return;
    if (hovering && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else if (!hovering && videoRef.current) {
      videoRef.current.pause();
    }
  }, [hovering, isVideo]);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white/[0.04] transition-all hover:border-white/[0.12] ${
        isExpanded ? "border-cyan/30" : "border-white/[0.10]"
      }`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Thumbnail / Preview */}
      {hasOutput && firstOutput && (
        <div
          className="relative aspect-video cursor-pointer bg-black/40"
          onClick={() => onToggle(isExpanded ? null : job.id)}
        >
          {isVideo ? (
            hovering ? (
              <video
                ref={videoRef}
                src={mediaUrl(firstOutput)}
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Film size={32} className="text-muted/20" />
              </div>
            )
          ) : (
            <>
              <img
                src={mediaUrl(firstOutput)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 flex items-center justify-center -z-0">
                <ImageIcon size={32} className="text-muted/20" />
              </div>
            </>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <div className="rounded-full bg-white/20 p-2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              {isVideo ? (
                <Play size={20} className="text-white" fill="white" />
              ) : (
                <Maximize2 size={18} className="text-white" />
              )}
            </div>
          </div>

          {/* Type badge */}
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
            style={{ backgroundColor: color + "30", color }}
          >
            {typeLabels[job.type] ?? job.type}
          </div>

          {/* Video indicator */}
          {isVideo && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm flex items-center gap-1">
              <Play size={8} fill="currentColor" />
              Video
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-3 cursor-pointer" onClick={() => onToggle(isExpanded ? null : job.id)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white line-clamp-1">{job.description}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          {relativeTimeShort(job.createdAt)}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-white/[0.08] p-3 space-y-2">
          {job.enhancedPrompt && (
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">Enhanced Prompt</p>
              <p className="text-xs text-white/60 leading-relaxed">{job.enhancedPrompt}</p>
            </div>
          )}
          {job.outputPaths.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {job.outputPaths.map((p, i) => (
                p.endsWith(".mp4") ? (
                  <video key={i} src={mediaUrl(p)} className="w-full rounded-lg" controls muted playsInline />
                ) : (
                  <img key={i} src={mediaUrl(p)} alt="" className="w-full rounded-lg" loading="lazy" />
                )
              ))}
            </div>
          )}
          <p className="text-[9px] text-muted font-mono">{job.id}</p>
        </div>
      )}
    </div>
  );
}

function HiggsTab() {
  const [jobs, setJobs] = useState<HiggsJob[]>([]);
  const [filter, setFilter] = useState<HiggsFilter>("all");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = () => {
      getWhatsAppJobs()
        .then((data) => setJobs(Array.isArray(data) ? data as HiggsJob[] : []))
        .catch(() => {});
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const completed = useMemo(() => jobs.filter((j) => j.status === "completed"), [jobs]);
  const filtered = useMemo(() => {
    if (filter === "all") return completed;
    return completed.filter((j) => j.type === filter);
  }, [completed, filter]);

  const stats = useMemo(() => ({
    total: completed.length,
    images: completed.filter((j) => j.type === "image").length,
    clips: completed.filter((j) => j.type === "clip").length,
    lessons: completed.filter((j) => j.type === "lesson").length,
    successRate: jobs.length > 0 ? Math.round((completed.length / jobs.length) * 100) : 0,
  }), [jobs, completed]);

  const TYPE_COLORS: Record<string, string> = {
    image: "#f59e0b",
    clip: "#8b5cf6",
    lesson: "#10b981",
    "news-content": "#f97316",
  };

  const TYPE_LABELS: Record<string, string> = {
    image: "Image",
    clip: "Clip",
    lesson: "Lesson",
    "news-content": "News",
  };

  const FILTER_OPTIONS: { key: HiggsFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "image", label: "Images" },
    { key: "clip", label: "Clips" },
    { key: "lesson", label: "Lessons" },
    { key: "news-content", label: "News" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Generated", value: stats.total, color: "var(--cyan)", icon: Zap },
          { label: "Images", value: stats.images, color: "#f59e0b", icon: ImageIcon },
          { label: "Clips", value: stats.clips, color: "#8b5cf6", icon: Video },
          { label: "Lessons", value: stats.lessons, color: "#22c55e", icon: BookOpen },
          { label: "Success Rate", value: `${stats.successRate}%`, color: "var(--success)", icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <span className="text-lg font-bold text-white">{s.value}</span>
              <p className="text-[10px] text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
              filter === opt.key
                ? "bg-white/10 text-white border-white/20"
                : "bg-white/[0.02] text-muted border-white/[0.10] hover:bg-white/[0.05]"
            }`}
          >
            {opt.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {opt.key === "all" ? completed.length : completed.filter((j) => j.type === opt.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Thumbnail grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((job) => (
          <HiggsCard key={job.id} job={job} typeColors={TYPE_COLORS} typeLabels={TYPE_LABELS} expandedJob={expandedJob} onToggle={setExpandedJob} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted">
          No generated content yet
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────

export default function DashboardPage() {
  const { status, stats, clips, isLoading, refreshAll } = useDashboardStore();
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiShown, setConfettiShown] = useState(false);
  const [tab, setTab] = useState<DashboardTab>("local");

  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);

  useEffect(() => {
    refreshAll();
    getLogs().then((data) => setRecentActivity(data.recent)).catch(() => {});
  }, [refreshAll]);

  const v1Done = status?.v1?.done ?? 0;
  const v1Total = status?.v1?.total ?? 25;

  // Trigger confetti when V1 is fully done (milestone celebration)
  useEffect(() => {
    if (!confettiShown && v1Done > 0 && v1Done >= v1Total) {
      setShowConfetti(true);
      setConfettiShown(true);
    }
  }, [v1Done, v1Total, confettiShown]);

  if (isLoading && !status) return <DashboardSkeleton />;

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

  const v1Pct = v1Total > 0 ? Math.round((v1Done / v1Total) * 100) : 0;
  const v2Pct = v2Total > 0 ? Math.round((v2Done / v2Total) * 100) : 0;
  const narPct = narTotal > 0 ? Math.round((narDone / narTotal) * 100) : 0;
  const overallPct = Math.round((v1Pct + v2Pct + narPct) / 3);

  const chartData = buildChartData(stats);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Confetti Celebration */}
      <Confetti active={showConfetti} onDone={handleConfettiDone} />

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 w-fit">
        <button
          onClick={() => setTab("local")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "local"
              ? "bg-white/10 text-white"
              : "text-muted hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Monitor size={14} />
          Local Production
        </button>
        <button
          onClick={() => setTab("higgs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "higgs"
              ? "bg-lime/15 text-lime"
              : "text-muted hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Zap size={14} />
          Higgsfield
        </button>
      </div>

      {/* Higgs Tab */}
      {tab === "higgs" && <HiggsTab />}

      {/* Local Tab */}
      {tab === "local" && <>

      {/* Greeting Banner */}
      <GreetingBanner
        v1Done={v1Done} v2Done={v2Done} narDone={narDone}
        v1Total={v1Total} v2Total={v2Total} narTotal={narTotal}
      />

      {/* Overall Progress + Phase Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <OverallProgressRing pct={overallPct} />
        <PhaseCard label="V1 Standard" done={v1Done} total={v1Total} color="#3b82f6"
          status={v1Done >= v1Total ? "done" : "active"} />
        <PhaseCard label="V2 Enhanced" done={v2Done} total={v2Total} color="#ff6b35"
          status={v2Done < v2Total ? "active" : "done"} />
        <PhaseCard label="Narration" done={narDone} total={narTotal} color="#22c55e"
          status={narDone >= narTotal ? "done" : "idle"} />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Currently Rendering */}
      {stats?.currently_rendering && (
        <CurrentlyRendering
          shot_id={stats.currently_rendering.shot_id}
          phase={stats.currently_rendering.phase}
          queued_at={stats.currently_rendering.queued_at}
        />
      )}

      {/* Film Timeline + Shot Map */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FilmTimeline clips={clips} />
        <ShotMap clips={clips} />
      </div>

      {/* Production Summary Cards */}
      <ProductionSummary
        totalRenders={totalRenders} totalHours={totalHours}
        avgSeconds={avgSeconds} diskMb={diskMb}
      />

      {/* Pipeline Progress + GPU Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-5 section-heading">Pipeline Progress</h3>
          <div className="space-y-5">
            <PipelineBar label="V1 Standard" done={v1Done} total={v1Total} color="#3b82f6" />
            <PipelineBar label="V2 Enhanced" done={v2Done} total={v2Total} color="#ff6b35" />
            <PipelineBar label="Narration" done={narDone} total={narTotal} color="#22c55e" />
            <PipelineBar label="Composite" done={compDone} total={v1Total} color="#f59e0b" />
          </div>
        </div>
        <GpuStatsWidget />
      </div>

      {/* Pipeline Health + Scene Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelineHealthGauge v1Pct={v1Pct} v2Pct={v2Pct} narPct={narPct} />
        <SceneBreakdown clips={clips} />
      </div>

      {/* Render Queue */}
      <RenderQueueWidget stats={stats} />

      {/* V2 Enhancement Tracker + Render Heatmap */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <V2EnhancementTracker clips={clips} />
        <RenderHeatmap stats={stats} />
      </div>

      {/* Production Milestones */}
      <ProductionMilestones
        v1Done={v1Done} v2Done={v2Done} narDone={narDone}
        v1Total={v1Total} v2Total={v2Total}
      />

      {/* Render Performance Chart */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white section-heading">Render Performance</h3>
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
              <Bar dataKey="v2" name="V2 Enhanced" fill="var(--cyan)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Feed + Quick Notes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed entries={recentActivity} />
        </div>
        <QuickNotes />
      </div>

      {/* File Sizes */}
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
          color="var(--cyan)" />
        <FileSizeCard label="Audio"
          count={stats?.audio_file_sizes?.count ?? 0}
          totalMb={stats?.audio_file_sizes?.total_mb ?? 0}
          avgKb={stats?.audio_file_sizes?.avg_kb ?? 0}
          color="#22c55e" />
      </div>

      {/* Pipeline Insights */}
      <PipelineInsights
        v1Done={v1Done} v2Done={v2Done} narDone={narDone}
        v1Total={v1Total} v2Total={v2Total} narTotal={narTotal}
      />

      </>}
    </div>
  );
}
