"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { getWhatsAppJobs } from "@/lib/api";
import {
  Film, Zap,
  Play, Image as ImageIcon, Video, BookOpen,
  CheckCircle2, Maximize2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────

export interface HiggsJob {
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

export type HiggsFilter = "all" | "image" | "clip" | "lesson" | "news-content";

// ── Helpers ──────────────────────────────────────────

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

// ── Sub-component ────────────────────────────────────

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

// ── Main Component ───────────────────────────────────

export function HiggsTab() {
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
          { label: "Total Generated", value: stats.total, color: "var(--cyan)", bg: "color-mix(in srgb, var(--cyan) 8%, transparent)", icon: Zap },
          { label: "Images", value: stats.images, color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 8%, transparent)", icon: ImageIcon },
          { label: "Clips", value: stats.clips, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", icon: Video },
          { label: "Lessons", value: stats.lessons, color: "var(--success)", bg: "color-mix(in srgb, var(--success) 8%, transparent)", icon: BookOpen },
          { label: "Success Rate", value: `${stats.successRate}%`, color: "var(--success)", bg: "color-mix(in srgb, var(--success) 8%, transparent)", icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
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
