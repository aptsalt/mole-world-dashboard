"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Image as ImageIcon,
  Video,
  BookOpen,
  Search,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Zap,
  Film,
  Maximize2,
} from "lucide-react";
import { clsx } from "clsx";
import { getWhatsAppJobs } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────
interface GalleryJob {
  id: string;
  type: string;
  description: string;
  enhancedPrompt: string | null;
  status: string;
  outputPaths: string[];
  createdAt: string;
  completedAt: string | null;
}

type GalleryFilter = "all" | "image" | "clip" | "lesson";
type SortMode = "newest" | "oldest";

function mediaUrl(outputPath: string): string {
  const filename = outputPath.split("/").pop() ?? "";
  return `/api/whatsapp/media?file=${encodeURIComponent(filename)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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

// ── Gallery Card (matches VideoCard pattern) ───────────────────

function GalleryCard({
  job,
  outputPath,
  outputIndex,
  onOpen,
}: {
  job: GalleryJob;
  outputPath: string;
  outputIndex: number;
  onOpen: (jobId: string, outputIndex: number) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = outputPath.endsWith(".mp4");
  const color = TYPE_COLORS[job.type] ?? "#6b7280";

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
      className="group relative overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.04] transition-all hover:border-white/[0.12]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Thumbnail / Preview */}
      <div
        className="relative aspect-video cursor-pointer bg-black/40"
        onClick={() => onOpen(job.id, outputIndex)}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl(outputPath)}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={mediaUrl(outputPath)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Fallback icon when media hasn't loaded */}
        <div className="absolute inset-0 flex items-center justify-center -z-0">
          {isVideo ? (
            <Film size={32} className="text-muted/20" />
          ) : (
            <ImageIcon size={32} className="text-muted/20" />
          )}
        </div>

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
          style={{
            backgroundColor: color + "30",
            color: color,
          }}
        >
          {TYPE_LABELS[job.type] ?? job.type}
        </div>

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm flex items-center gap-1">
            <Play size={8} fill="currentColor" />
            Video
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white line-clamp-1">{job.description}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          {relativeTime(job.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function GalleryPage() {
  const [jobs, setJobs] = useState<GalleryJob[]>([]);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<{ jobId: string; outputIndex: number } | null>(null);

  const fetchJobs = useCallback(() => {
    getWhatsAppJobs()
      .then((data) => setJobs(Array.isArray(data) ? (data as GalleryJob[]).filter((j) => j.status === "completed" && j.outputPaths.length > 0) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10_000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (filter !== "all") list = list.filter((j) => j.type === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.description.toLowerCase().includes(q) ||
        (j.enhancedPrompt?.toLowerCase().includes(q) ?? false)
      );
    }
    list = [...list].sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    );
    return list;
  }, [jobs, filter, sort, search]);

  // Flatten all outputs for lightbox navigation
  const allOutputs = useMemo(() => {
    const items: { job: GalleryJob; outputIndex: number; path: string }[] = [];
    for (const job of filtered) {
      for (let i = 0; i < job.outputPaths.length; i++) {
        items.push({ job, outputIndex: i, path: job.outputPaths[i] });
      }
    }
    return items;
  }, [filtered]);

  const lightboxIndex = lightbox
    ? allOutputs.findIndex((o) => o.job.id === lightbox.jobId && o.outputIndex === lightbox.outputIndex)
    : -1;

  function openLightbox(jobId: string, outputIndex: number) {
    setLightbox({ jobId, outputIndex });
  }

  function closeLightbox() {
    setLightbox(null);
  }

  function navigateLightbox(dir: -1 | 1) {
    if (lightboxIndex < 0) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < allOutputs.length) {
      const item = allOutputs[next];
      setLightbox({ jobId: item.job.id, outputIndex: item.outputIndex });
    }
  }

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const stats = useMemo(() => ({
    images: jobs.filter((j) => j.type === "image").length,
    videos: jobs.filter((j) => j.type === "clip").length,
    lessons: jobs.filter((j) => j.type === "lesson").length,
  }), [jobs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime/20 to-cyan-400/20 flex items-center justify-center">
            <Zap size={20} className="text-lime" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gallery</h1>
            <p className="text-xs text-muted">
              {stats.images} images &middot; {stats.videos} clips &middot; {stats.lessons} lessons
            </p>
          </div>
        </div>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-muted hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.10]"
        >
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Images", value: stats.images, color: "#f59e0b", icon: ImageIcon },
          { label: "Clips", value: stats.videos, color: "#8b5cf6", icon: Video },
          { label: "Lessons", value: stats.lessons, color: "#22c55e", icon: BookOpen },
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type filter */}
        <div className="flex gap-1.5">
          {(["all", "image", "clip", "lesson"] as GalleryFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
                filter === f
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-white/[0.02] text-muted border-white/[0.10] hover:bg-white/[0.05]"
              )}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        {/* Search */}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search descriptions..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-52"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((job) =>
          job.outputPaths.map((outputPath, oi) => (
            <GalleryCard
              key={`${job.id}_${oi}`}
              job={job}
              outputPath={outputPath}
              outputIndex={oi}
              onOpen={openLightbox}
            />
          ))
        )}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted">
          {jobs.length === 0 ? "No generated content yet" : "No items match filters"}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && lightboxIndex >= 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
          >
            <X size={20} />
          </button>

          {/* Nav prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Nav next */}
          {lightboxIndex < allOutputs.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Media */}
          <div
            className="max-w-4xl max-h-[85vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {allOutputs[lightboxIndex].path.endsWith(".mp4") ? (
              <video
                src={mediaUrl(allOutputs[lightboxIndex].path)}
                className="w-full max-h-[75vh] object-contain rounded-xl"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={mediaUrl(allOutputs[lightboxIndex].path)}
                alt=""
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
            )}
            <div className="mt-3 text-center">
              <p className="text-sm text-white/80">{allOutputs[lightboxIndex].job.description}</p>
              <p className="text-xs text-white/40 mt-1">
                {relativeTime(allOutputs[lightboxIndex].job.createdAt)} &middot; {allOutputs[lightboxIndex].job.type}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
