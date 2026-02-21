"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Film,
  Grid3X3,
  List,
  RefreshCw,
  Play,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertTriangle,
  Search,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { clsx } from "clsx";
import { getVideos } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────

interface VideoEntry {
  shotId: string;
  sceneId: string;
  sceneName: string;
  modelSuffix: string;
  modelName: string;
  fileName: string;
  sizeBytes: number;
  sizeKb: number;
  videoUrl: string;
  heroUrl: string | null;
  createdAt: string;
}

interface VideoStats {
  totalVideos: number;
  totalShots: number;
  shotsWithImages: number;
  byModel: Record<string, number>;
  byScene: Record<string, number>;
  totalSizeBytes: number;
}

// ── Constants ──────────────────────────────────────────────────

const MODELS = [
  { key: "hailuo", label: "Hailuo 2.3", color: "#f59e0b" },
  { key: "seed15", label: "Seedance 1.5 Pro", color: "#10b981" },
  { key: "kling25", label: "Kling 2.5 Turbo", color: "#8b5cf6" },
];

const SCENES: Record<string, string> = {
  P1_S01: "S01 · Underground World",
  P1_S02: "S02 · Anaya's Morning",
  P1_S03: "S03 · Deep Tunnels",
  P1_S04: "S04 · Data Stream",
  P1_S05: "S05 · Selection Hall",
  P1_S06: "S06 · Corridor Awakening",
  P1_S07: "S07 · Lower Meeting",
  P1_S08: "S08 · Transit System",
  P1_S09: "S09 · Food Hall",
  P1_S10: "S10 · Surveillance Ops",
  P1_S11: "S11 · Night Cycle",
  P1_S12: "S12 · Architect Station",
  P1_S13: "S13 · Montage",
  P1_S14: "S14 · Three Lights",
};

// ── Helpers ────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getModelColor(suffix: string): string {
  return MODELS.find((m) => m.key === suffix)?.color ?? "#6b7280";
}

// ── Stats Bar ──────────────────────────────────────────────────

function StatsBar({ stats }: { stats: VideoStats }) {
  const expectedTotal = stats.shotsWithImages * 3;
  const pct = expectedTotal > 0 ? Math.round((stats.totalVideos / expectedTotal) * 100) : 0;
  const totalMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="rounded-xl border border-white/[0.10] bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-6">
        {/* Overall progress */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-white">
              {stats.totalVideos} / {expectedTotal} videos
            </span>
            <span className="text-xs text-muted">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-cyan/60 transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex gap-3 text-[10px] text-muted">
            <span>{stats.shotsWithImages} shots with images</span>
            <span>·</span>
            <span>{totalMB} MB total</span>
          </div>
        </div>

        {/* Per-model counts */}
        {MODELS.map((model) => {
          const count = stats.byModel[model.label] ?? 0;
          return (
            <div key={model.key} className="text-center">
              <div className="text-lg font-bold" style={{ color: model.color }}>
                {count}
              </div>
              <div className="text-[10px] text-muted">{model.label}</div>
            </div>
          );
        })}

        {/* Missing count */}
        <div className="text-center">
          <div className="text-lg font-bold text-muted">
            {expectedTotal - stats.totalVideos}
          </div>
          <div className="text-[10px] text-muted">Pending</div>
        </div>
      </div>
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────

function FilterBar({
  modelFilter,
  setModelFilter,
  sceneFilter,
  setSceneFilter,
  search,
  setSearch,
  viewMode,
  setViewMode,
}: {
  modelFilter: string;
  setModelFilter: (v: string) => void;
  sceneFilter: string;
  setSceneFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Model filter chips */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted mr-1">Model:</span>
        <button
          onClick={() => setModelFilter("")}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition-all",
            !modelFilter
              ? "bg-cyan/15 text-cyan"
              : "bg-white/[0.04] text-muted hover:text-white"
          )}
        >
          All
        </button>
        {MODELS.map((m) => (
          <button
            key={m.key}
            onClick={() => setModelFilter(modelFilter === m.key ? "" : m.key)}
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              modelFilter === m.key
                ? "text-white"
                : "bg-white/[0.04] text-muted hover:text-white"
            )}
            style={
              modelFilter === m.key
                ? { backgroundColor: m.color + "25", color: m.color }
                : undefined
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Scene filter dropdown */}
      <select
        value={sceneFilter}
        onChange={(e) => setSceneFilter(e.target.value)}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none focus:border-cyan/30"
      >
        <option value="">All Scenes</option>
        {Object.entries(SCENES).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>

      {/* Search */}
      <div className="relative flex-1 min-w-[140px] max-w-[240px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search shot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-muted/50 outline-none focus:border-cyan/30"
        />
      </div>

      {/* View toggle */}
      <div className="ml-auto flex gap-1 rounded-lg border border-white/[0.08] p-0.5">
        <button
          onClick={() => setViewMode("grid")}
          className={clsx(
            "rounded-md p-1.5 transition-colors",
            viewMode === "grid" ? "bg-white/[0.08] text-white" : "text-muted hover:text-white"
          )}
        >
          <Grid3X3 size={14} />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={clsx(
            "rounded-md p-1.5 transition-colors",
            viewMode === "list" ? "bg-white/[0.08] text-white" : "text-muted hover:text-white"
          )}
        >
          <List size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Video Card (Grid) ──────────────────────────────────────────

function VideoCard({
  video,
  onPlay,
}: {
  video: VideoEntry;
  onPlay: (v: VideoEntry) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (hovering && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else if (!hovering && videoRef.current) {
      videoRef.current.pause();
    }
  }, [hovering]);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.04] transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Thumbnail / Preview */}
      <div
        className="relative aspect-video cursor-pointer bg-black/40"
        onClick={() => onPlay(video)}
      >
        {hovering ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : video.heroUrl ? (
          <img
            src={video.heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : null}
        {/* Fallback icon when no hero or image fails */}
        {!hovering && (
          <div className="absolute inset-0 flex items-center justify-center -z-0">
            <Film size={32} className="text-muted/20" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <div className="rounded-full bg-white/20 p-2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <Play size={20} className="text-white" fill="white" />
          </div>
        </div>

        {/* Model badge */}
        <div
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
          style={{
            backgroundColor: getModelColor(video.modelSuffix) + "30",
            color: getModelColor(video.modelSuffix),
          }}
        >
          {video.modelName}
        </div>

        {/* Size badge */}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
          {formatSize(video.sizeBytes)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">{video.shotId}</span>
          <span className="text-[10px] text-muted">{formatTime(video.createdAt)}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted truncate">
          {video.sceneName}
        </div>
      </div>
    </div>
  );
}

// ── Video Row (List) ───────────────────────────────────────────

function VideoRow({
  video,
  onPlay,
}: {
  video: VideoEntry;
  onPlay: (v: VideoEntry) => void;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-white/[0.10] bg-white/[0.04] px-4 py-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer"
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black/40">
        {video.heroUrl ? (
          <img src={video.heroUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center -z-0">
          <Film size={16} className="text-muted/30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Play size={12} className="text-white/70" fill="white" />
        </div>
      </div>

      {/* Shot info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{video.shotId}</div>
        <div className="text-[11px] text-muted truncate">{video.sceneName}</div>
      </div>

      {/* Model */}
      <div
        className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        style={{
          backgroundColor: getModelColor(video.modelSuffix) + "20",
          color: getModelColor(video.modelSuffix),
        }}
      >
        {video.modelName}
      </div>

      {/* Size */}
      <div className="shrink-0 text-xs text-muted w-16 text-right">
        {formatSize(video.sizeBytes)}
      </div>

      {/* Time */}
      <div className="shrink-0 text-[11px] text-muted w-14 text-right">
        {formatTime(video.createdAt)}
      </div>
    </div>
  );
}

// ── Cinema Modal ───────────────────────────────────────────────

function CinemaModal({
  video,
  videos,
  onClose,
  onNavigate,
}: {
  video: VideoEntry;
  videos: VideoEntry[];
  onClose: () => void;
  onNavigate: (v: VideoEntry) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const idx = videos.findIndex((v) => v.fileName === video.fileName);

  const prev = idx > 0 ? videos[idx - 1] : null;
  const next = idx < videos.length - 1 ? videos[idx + 1] : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNavigate(prev);
      if (e.key === "ArrowRight" && next) onNavigate(next);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNavigate, prev, next]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* Nav arrows */}
      {prev && (
        <button
          onClick={() => onNavigate(prev)}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {next && (
        <button
          onClick={() => onNavigate(next)}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Video */}
      <div className="flex flex-col items-center gap-4 max-w-[80vw] max-h-[85vh]">
        <video
          ref={videoRef}
          src={video.videoUrl}
          controls
          autoPlay
          muted={muted}
          className="max-h-[70vh] rounded-xl shadow-2xl"
        />

        {/* Info bar */}
        <div className="flex items-center gap-4 rounded-xl bg-white/[0.06] px-5 py-3 backdrop-blur-sm">
          <span className="text-sm font-semibold text-white">{video.shotId}</span>
          <span className="text-xs text-muted">{video.sceneName}</span>
          <div
            className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: getModelColor(video.modelSuffix) + "25",
              color: getModelColor(video.modelSuffix),
            }}
          >
            {video.modelName}
          </div>
          <span className="text-xs text-muted">{formatSize(video.sizeBytes)}</span>
          <button
            onClick={() => setMuted(!muted)}
            className="text-muted hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <a
            href={video.videoUrl}
            download={video.fileName}
            className="text-muted hover:text-white transition-colors"
          >
            <Download size={14} />
          </a>
          <span className="text-[11px] text-muted ml-auto">
            {idx + 1} / {videos.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Shot Group View (grouped by shot) ──────────────────────────

function ShotGroup({
  shotId,
  videos,
  sceneName,
  onPlay,
}: {
  shotId: string;
  videos: VideoEntry[];
  sceneName: string;
  onPlay: (v: VideoEntry) => void;
}) {
  const modelMap = new Map(videos.map((v) => [v.modelSuffix, v]));

  return (
    <div className="rounded-xl border border-white/[0.10] bg-white/[0.04] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/[0.10] px-4 py-2.5">
        <span className="text-sm font-semibold text-white">{shotId}</span>
        <span className="text-[11px] text-muted">{sceneName}</span>
        <div className="ml-auto flex gap-1">
          {MODELS.map((m) => (
            <div
              key={m.key}
              className={clsx(
                "h-2 w-2 rounded-full",
                modelMap.has(m.key) ? "" : "opacity-20"
              )}
              style={{ backgroundColor: m.color }}
              title={`${m.label}: ${modelMap.has(m.key) ? "Done" : "Pending"}`}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
        {MODELS.map((m) => {
          const video = modelMap.get(m.key);
          if (video) {
            return (
              <div
                key={m.key}
                className="relative aspect-video cursor-pointer bg-black/40 group"
                onClick={() => onPlay(video)}
              >
                {video.heroUrl && (
                  <img
                    src={video.heroUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <Play size={20} className="text-white" fill="white" />
                </div>
                <div
                  className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ backgroundColor: m.color + "30", color: m.color }}
                >
                  {m.label}
                </div>
                <div className="absolute bottom-1.5 right-1.5 text-[9px] text-white/60">
                  {formatSize(video.sizeBytes)}
                </div>
                <Check
                  size={12}
                  className="absolute right-1.5 top-1.5"
                  style={{ color: m.color }}
                />
              </div>
            );
          }
          return (
            <div
              key={m.key}
              className="relative aspect-video bg-white/[0.04] flex items-center justify-center"
            >
              <div className="text-center">
                <Clock size={16} className="mx-auto text-muted/30 mb-1" />
                <div className="text-[9px] text-muted/40">{m.label}</div>
                <div className="text-[9px] text-muted/30">Pending</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modelFilter, setModelFilter] = useState("");
  const [sceneFilter, setSceneFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByShot, setGroupByShot] = useState(false);
  const [cinemaVideo, setCinemaVideo] = useState<VideoEntry | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const data = await getVideos() as { videos: VideoEntry[]; stats: VideoStats };
      setVideos(data.videos ?? []);
      setStats(data.stats ?? null);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    fetchVideos();
    const interval = setInterval(() => {
      fetchVideos();
      setRefreshCount((c) => c + 1);
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  // Filtered videos
  const filtered = useMemo(() => {
    let result = videos;
    if (modelFilter) result = result.filter((v) => v.modelSuffix === modelFilter);
    if (sceneFilter) result = result.filter((v) => v.sceneId === sceneFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.shotId.toLowerCase().includes(q) ||
          v.sceneName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [videos, modelFilter, sceneFilter, search]);

  // Group by shot for comparison view
  const shotGroups = useMemo(() => {
    const groups = new Map<string, { videos: VideoEntry[]; sceneName: string }>();
    for (const v of filtered) {
      if (!groups.has(v.shotId)) {
        groups.set(v.shotId, { videos: [], sceneName: v.sceneName });
      }
      groups.get(v.shotId)!.videos.push(v);
    }
    return groups;
  }, [filtered]);

  const handlePlay = useCallback((v: VideoEntry) => setCinemaVideo(v), []);
  const handleNavigate = useCallback((v: VideoEntry) => setCinemaVideo(v), []);

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-cyan" />
          <span className="text-sm text-muted">Loading videos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Film size={22} className="text-cyan" />
            Video Generation
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            87 shots × 3 unlimited models — zero credits
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Group toggle */}
          <button
            onClick={() => setGroupByShot(!groupByShot)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              groupByShot
                ? "bg-cyan/15 text-cyan"
                : "bg-white/[0.04] text-muted hover:text-white"
            )}
          >
            Compare Shots
          </button>
          {/* Refresh */}
          <button
            onClick={fetchVideos}
            className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-muted hover:text-white transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-[10px] text-muted/50">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Filters */}
      <FilterBar
        modelFilter={modelFilter}
        setModelFilter={setModelFilter}
        sceneFilter={sceneFilter}
        setSceneFilter={setSceneFilter}
        search={search}
        setSearch={setSearch}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock size={40} className="text-muted/20 mb-3" />
          <p className="text-sm text-muted">
            {videos.length === 0
              ? "No videos generated yet — batch is running..."
              : "No videos match the current filters"}
          </p>
          {videos.length === 0 && (
            <p className="mt-1 text-xs text-muted/50">
              Auto-refreshing every 15 seconds
            </p>
          )}
        </div>
      ) : groupByShot ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from(shotGroups.entries()).map(([shotId, group]) => (
            <ShotGroup
              key={shotId}
              shotId={shotId}
              videos={group.videos}
              sceneName={group.sceneName}
              onPlay={handlePlay}
            />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((v) => (
            <VideoCard key={v.fileName} video={v} onPlay={handlePlay} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((v) => (
            <VideoRow key={v.fileName} video={v} onPlay={handlePlay} />
          ))}
        </div>
      )}

      {/* Results count */}
      {filtered.length > 0 && (
        <div className="text-center text-[11px] text-muted/50">
          Showing {filtered.length} video{filtered.length !== 1 ? "s" : ""}
          {(modelFilter || sceneFilter || search) && ` (filtered from ${videos.length})`}
        </div>
      )}

      {/* Cinema Modal */}
      {cinemaVideo && (
        <CinemaModal
          video={cinemaVideo}
          videos={filtered}
          onClose={() => setCinemaVideo(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
