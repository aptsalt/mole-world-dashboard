"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Brain,
  Monitor,
  ChevronDown,
  ChevronUp,
  SkipForward,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Loader2,
  X,
  Maximize2,
  Grid,
  List,
  Trash2,
  CheckSquare,
  Square as SquareIcon,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";
import { useDashboardStore } from "@/lib/store";
import { automationQueueAction, approveCredits } from "@/lib/api";
import type {
  AutomationServiceStatus,
  AutomationQueueItem,
  AutomationEvent,
  AutomationShotStatus,
  AutomationQueueStats,
} from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────

interface MediaFile {
  path: string;
  model: string;
  filename: string;
}

interface ShotMedia {
  shotId: string;
  sceneId: string;
  images: string[];
  videos: string[];
  heroImage: string | null;
  modelImages: MediaFile[];
}

// ── Status helpers ────────────────────────────────────────────

const STATUS_COLORS: Record<AutomationShotStatus, string> = {
  pending: "text-muted",
  generating_image: "text-cyan",
  assessing_image: "text-cyan",
  retrying_image: "text-warning",
  generating_video: "text-purple-400",
  assessing_video: "text-purple-400",
  retrying_video: "text-warning",
  downloading: "text-blue-400",
  completed: "text-success",
  failed: "text-red-400",
  paused_for_credits: "text-warning",
  skipped: "text-muted",
};

const STATUS_LABELS: Record<AutomationShotStatus, string> = {
  pending: "Pending",
  generating_image: "Generating Image",
  assessing_image: "Assessing Image",
  retrying_image: "Retrying Image",
  generating_video: "Generating Video",
  assessing_video: "Assessing Video",
  retrying_video: "Retrying Video",
  downloading: "Downloading",
  completed: "Completed",
  failed: "Failed",
  paused_for_credits: "Needs Credits",
  skipped: "Skipped",
};

// ── Components ────────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationShotStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        STATUS_COLORS[status],
        status === "completed" && "bg-success/10",
        status === "failed" && "bg-red-400/10",
        status === "paused_for_credits" && "bg-warning/10",
        (status === "generating_image" || status === "assessing_image") && "bg-cyan/10",
        (status === "generating_video" || status === "assessing_video") && "bg-purple-400/10",
        status === "pending" && "bg-white/[0.04]",
        status === "skipped" && "bg-white/[0.04]",
      )}
    >
      {(status.includes("generating") || status.includes("assessing")) && (
        <Loader2 size={10} className="animate-spin" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

function ServiceStatusCard({ status }: { status: AutomationServiceStatus | null }) {
  if (!status) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-muted">
          <Monitor size={16} />
          <span className="text-sm">No automation data available</span>
        </div>
      </div>
    );
  }

  const stateColor =
    status.state === "running" ? "text-success" :
    status.state === "paused" ? "text-warning" :
    status.state === "error" ? "text-red-400" :
    "text-muted";

  const stateIcon =
    status.state === "running" ? <Play size={14} className="text-success" /> :
    status.state === "paused" ? <Pause size={14} className="text-warning" /> :
    status.state === "error" ? <XCircle size={14} className="text-red-400" /> :
    <Square size={14} className="text-muted" />;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stateIcon}
          <div>
            <span className={clsx("text-sm font-semibold capitalize", stateColor)}>
              {status.state}
            </span>
            {status.currentShot && (
              <p className="text-xs text-muted mt-0.5">
                {status.currentShot} — {status.currentStep?.replace(/_/g, " ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <div className="flex items-center gap-1">
            <Brain size={12} className={status.ollamaConnected ? "text-success" : "text-red-400"} />
            <span>Ollama</span>
          </div>
          <div className="flex items-center gap-1">
            <Monitor size={12} className={status.browserConnected ? "text-success" : "text-red-400"} />
            <span>Browser</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueStatsBar({ stats }: { stats: AutomationQueueStats | undefined }) {
  if (!stats || stats.total === 0) return null;

  const completedPct = (stats.completed / stats.total) * 100;
  const failedPct = (stats.failed / stats.total) * 100;
  const inProgressPct = (stats.inProgress / stats.total) * 100;
  const creditsPct = (stats.pausedForCredits / stats.total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{stats.completed} / {stats.total} shots complete</span>
        <span>{Math.round(completedPct)}%</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="bg-success transition-all" style={{ width: `${completedPct}%` }} />
        <div className="bg-cyan transition-all" style={{ width: `${inProgressPct}%` }} />
        <div className="bg-warning transition-all" style={{ width: `${creditsPct}%` }} />
        <div className="bg-red-400 transition-all" style={{ width: `${failedPct}%` }} />
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Done {stats.completed}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan" /> Active {stats.inProgress}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white/20" /> Pending {stats.pending}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Credits {stats.pausedForCredits}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Failed {stats.failed}</span>
        {stats.skipped > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white/10" /> Skipped {stats.skipped}</span>}
      </div>
    </div>
  );
}

// ── Preview Lightbox ──────────────────────────────────────────

function PreviewLightbox({
  shot,
  onClose,
}: {
  shot: ShotMedia;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"images" | "videos" | "models">(
    shot.videos.length > 0 ? "videos" : "images",
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Group model images by model name for comparison view
  const modelGroups = shot.modelImages.reduce<Record<string, MediaFile[]>>((acc, img) => {
    if (!acc[img.model]) acc[img.model] = [];
    acc[img.model].push(img);
    return acc;
  }, {});
  const modelNames = Object.keys(modelGroups).sort();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (activeTab !== "models") {
        const items = activeTab === "images" ? shot.images : shot.videos;
        if (e.key === "ArrowRight") setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
        if (e.key === "ArrowLeft") setSelectedIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, activeTab, shot]);

  const currentItems = activeTab === "images" ? shot.images : activeTab === "videos" ? shot.videos : [];
  const currentPath = currentItems[selectedIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-bg p-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-white">{shot.shotId}</span>
            <span className="text-xs text-muted">{shot.sceneId}</span>
            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
              <button
                onClick={() => { setActiveTab("images"); setSelectedIndex(0); }}
                className={clsx(
                  "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeTab === "images" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white",
                )}
              >
                <ImageIcon size={10} /> Images ({shot.images.length})
              </button>
              <button
                onClick={() => { setActiveTab("videos"); setSelectedIndex(0); }}
                className={clsx(
                  "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeTab === "videos" ? "bg-purple-400/10 text-purple-400" : "text-muted hover:text-white",
                )}
              >
                <Video size={10} /> Videos ({shot.videos.length})
              </button>
              {modelNames.length > 0 && (
                <button
                  onClick={() => setActiveTab("models")}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors",
                    activeTab === "models" ? "bg-amber-400/10 text-amber-400" : "text-muted hover:text-white",
                  )}
                >
                  <Layers size={10} /> Compare ({modelNames.length} models)
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-white/[0.06] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Model comparison grid */}
        {activeTab === "models" && (
          <div className="space-y-3">
            <p className="text-[11px] text-muted">Same shot generated by different AI models — compare and choose the best</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(modelNames.length, 3)}, 1fr)` }}>
              {modelNames.map((model) => (
                <div key={model} className="rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
                  <div className="border-b border-white/[0.06] px-2.5 py-1.5">
                    <span className="text-[11px] font-semibold text-amber-400">{model}</span>
                    <span className="ml-1.5 text-[10px] text-muted">{modelGroups[model].length} img</span>
                  </div>
                  <div className="space-y-1 p-1">
                    {modelGroups[model].map((img) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={img.path}
                        src={`/api/media/${img.path}`}
                        alt={`${model} - ${img.filename}`}
                        className="w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main preview (images/videos tabs) */}
        {activeTab !== "models" && (
          <>
            <div className="flex items-center justify-center rounded-xl bg-black/40 overflow-hidden" style={{ minHeight: 400 }}>
              {currentPath ? (
                activeTab === "images" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/media/${currentPath}`}
                    alt={shot.shotId}
                    className="max-h-[70vh] w-auto object-contain"
                  />
                ) : (
                  <video
                    key={currentPath}
                    src={`/api/media/${currentPath}`}
                    controls
                    autoPlay
                    loop
                    className="max-h-[70vh] w-auto"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-muted">
                  {activeTab === "images" ? <ImageIcon size={32} /> : <Video size={32} />}
                  <span className="text-sm">No {activeTab} available</span>
                </div>
              )}
            </div>

            {/* Thumbnails strip */}
            {currentItems.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {currentItems.map((item, idx) => {
                  const filename = item.split("/").pop() ?? item;
                  return (
                    <button
                      key={item}
                      onClick={() => setSelectedIndex(idx)}
                      className={clsx(
                        "flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all",
                        idx === selectedIndex ? "border-cyan" : "border-transparent opacity-60 hover:opacity-100",
                      )}
                    >
                      {activeTab === "images" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={`/api/media/${item}`} alt={filename} className="h-14 w-20 object-cover" />
                      ) : (
                        <div className="flex h-14 w-20 items-center justify-center bg-white/[0.04]">
                          <Play size={14} className="text-muted" />
                          <span className="ml-1 text-[9px] text-muted">{filename.replace(/.*_/, "").replace(".mp4", "")}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current file info */}
            {currentPath && (
              <div className="mt-2 text-center text-[10px] text-muted">
                {currentPath.split("/").pop()} — {selectedIndex + 1}/{currentItems.length}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Media Gallery ─────────────────────────────────────────────

function MediaGallery({ media, onMediaDeleted }: { media: ShotMedia[]; onMediaDeleted: () => void }) {
  const [selectedShot, setSelectedShot] = useState<ShotMedia | null>(null);
  const [sceneFilter, setSceneFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const scenes = [...new Set(media.map((m) => m.sceneId))].sort();

  // Collect all unique model names from modelImages across all shots
  const allModels = [...new Set(media.flatMap((m) => m.modelImages?.map((mi) => mi.model) ?? []))].sort();

  // Filter by scene
  let filtered = sceneFilter === "all" ? media : media.filter((m) => m.sceneId === sceneFilter);

  // Filter by model: only show shots that have images from selected model
  if (modelFilter !== "all") {
    filtered = filtered.filter((m) =>
      m.modelImages?.some((mi) => mi.model === modelFilter),
    );
  }

  const totalImages = media.reduce((sum, m) => sum + m.images.length, 0);
  const totalModelImages = media.reduce((sum, m) => sum + (m.modelImages?.length ?? 0), 0);
  const totalVideos = media.reduce((sum, m) => sum + m.videos.length, 0);
  const shotsWithVideo = media.filter((m) => m.videos.length > 0).length;

  /** Get the thumbnail to display — when model filter active, show that model's image */
  const getThumbnail = (shot: ShotMedia): string | null => {
    if (modelFilter !== "all") {
      const modelImg = shot.modelImages?.find((mi) => mi.model === modelFilter);
      if (modelImg) return modelImg.path;
    }
    return shot.heroImage;
  };

  /** Get the model label for a shot when filtered */
  const getModelLabel = (shot: ShotMedia): string | null => {
    if (modelFilter !== "all") return modelFilter;
    return null;
  };

  const toggleSelectAll = () => {
    if (selectedPaths.size === filtered.reduce((sum, m) => sum + m.images.length, 0)) {
      setSelectedPaths(new Set());
    } else {
      const all = new Set<string>();
      for (const shot of filtered) {
        for (const img of shot.images) all.add(img);
      }
      setSelectedPaths(all);
    }
  };

  const togglePath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedPaths.size === 0) return;
    const confirmed = window.confirm(`Delete ${selectedPaths.size} selected file(s)? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/automation/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [...selectedPaths] }),
      });
      if (res.ok) {
        setSelectedPaths(new Set());
        setSelectMode(false);
        onMediaDeleted();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <ImageIcon size={16} className="text-cyan" />
          <span className="text-sm font-semibold text-white">Shot Preview Gallery</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted">
            {media.length} shots
          </span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
            {totalImages} images
          </span>
          {totalModelImages > 0 && (
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
              {totalModelImages} model variants
            </span>
          )}
          {totalVideos > 0 && (
            <span className="rounded-full bg-purple-400/10 px-2 py-0.5 text-[10px] text-purple-400">
              {totalVideos} videos ({shotsWithVideo} shots)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Select mode toggle */}
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedPaths(new Set()); }}
            className={clsx(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
              selectMode
                ? "border-red-400/30 bg-red-400/10 text-red-400"
                : "border-white/[0.08] text-muted hover:text-white",
            )}
          >
            <CheckSquare size={11} />
            {selectMode ? "Cancel" : "Select"}
          </button>
          {/* Delete button */}
          {selectMode && selectedPaths.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Delete {selectedPaths.size}
            </button>
          )}
          {selectMode && (
            <button
              onClick={toggleSelectAll}
              className="rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-muted hover:text-white transition-colors"
            >
              {selectedPaths.size > 0 ? "Deselect all" : "Select all"}
            </button>
          )}
          {/* Model filter */}
          {allModels.length > 0 && (
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-white outline-none"
            >
              <option value="all">All Models</option>
              {allModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          {/* Scene filter */}
          <select
            value={sceneFilter}
            onChange={(e) => setSceneFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-white outline-none"
          >
            <option value="all">All Scenes</option>
            {scenes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* View toggle */}
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx("p-1.5 transition-colors", viewMode === "grid" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white")}
            >
              <Grid size={12} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx("p-1.5 transition-colors", viewMode === "list" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white")}
            >
              <List size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((shot) => (
            <div
              key={shot.shotId}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/20 transition-all hover:border-cyan/30 hover:shadow-lg hover:shadow-cyan/5"
            >
              {/* Select checkbox */}
              {selectMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); shot.images.forEach((p) => togglePath(p)); }}
                  className="absolute left-1.5 top-1.5 z-10 rounded bg-black/50 p-0.5"
                >
                  {shot.images.every((p) => selectedPaths.has(p)) && shot.images.length > 0 ? (
                    <CheckSquare size={14} className="text-cyan" />
                  ) : (
                    <SquareIcon size={14} className="text-white/60" />
                  )}
                </button>
              )}
              <button onClick={() => setSelectedShot(shot)} className="w-full text-left">
                {(() => {
                  const thumb = getThumbnail(shot);
                  const label = getModelLabel(shot);
                  return thumb ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${thumb}`}
                        alt={shot.shotId}
                        className={clsx(
                          "aspect-video w-full object-cover transition-transform group-hover:scale-105",
                          selectMode && shot.images.every((p) => selectedPaths.has(p)) && shot.images.length > 0 && "opacity-60 ring-2 ring-cyan ring-inset",
                        )}
                        loading="lazy"
                      />
                      {label && (
                        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                          {label}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-white/[0.02]">
                      <ImageIcon size={20} className="text-muted" />
                    </div>
                  );
                })()}
                {/* Overlay */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="w-full p-2">
                    <Maximize2 size={12} className="absolute right-2 top-2 text-white/70" />
                  </div>
                </div>
                {/* Info bar */}
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="font-mono text-[10px] text-white">{shot.shotId.replace("P1_", "")}</span>
                  <div className="flex items-center gap-1">
                    {shot.modelImages && shot.modelImages.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-amber-400">
                        <Layers size={8} /> {[...new Set(shot.modelImages.map((m) => m.model))].length}
                      </span>
                    )}
                    {shot.images.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-success">
                        <ImageIcon size={8} /> {shot.images.length}
                      </span>
                    )}
                    {shot.videos.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-purple-400">
                        <Video size={8} /> {shot.videos.length}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="divide-y divide-white/[0.04]">
          {filtered.map((shot) => (
            <div
              key={shot.shotId}
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.02]"
            >
              {/* Select checkbox */}
              {selectMode && (
                <button
                  onClick={() => shot.images.forEach((p) => togglePath(p))}
                  className="flex-shrink-0"
                >
                  {shot.images.every((p) => selectedPaths.has(p)) && shot.images.length > 0 ? (
                    <CheckSquare size={14} className="text-cyan" />
                  ) : (
                    <SquareIcon size={14} className="text-white/40" />
                  )}
                </button>
              )}
              {/* Thumbnail */}
              <button onClick={() => setSelectedShot(shot)} className="flex flex-1 items-center gap-3">
                <div className="flex-shrink-0 overflow-hidden rounded-lg">
                  {(() => {
                    const thumb = getThumbnail(shot);
                    return thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/media/${thumb}`}
                        alt={shot.shotId}
                        className="h-10 w-16 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-10 w-16 items-center justify-center bg-white/[0.04] rounded-lg">
                        <ImageIcon size={12} className="text-muted" />
                      </div>
                    );
                  })()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-white">{shot.shotId}</span>
                  <span className="ml-2 text-[10px] text-muted">{shot.sceneId}</span>
                  {modelFilter !== "all" && (
                    <span className="ml-2 text-[10px] text-amber-400">{modelFilter}</span>
                  )}
                  {modelFilter === "all" && shot.modelImages && shot.modelImages.length > 0 && (
                    <span className="ml-2 text-[10px] text-amber-400">
                      {[...new Set(shot.modelImages.map((m) => m.model))].join(", ")}
                    </span>
                  )}
                </div>
                {/* Counts */}
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-success">
                    <ImageIcon size={10} /> {shot.images.length}
                  </span>
                  <span className={clsx("flex items-center gap-1", shot.videos.length > 0 ? "text-purple-400" : "text-muted")}>
                    <Video size={10} /> {shot.videos.length}
                  </span>
                </div>
                <Maximize2 size={12} className="text-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted">
          <ImageIcon size={28} />
          <p className="text-sm">No media files found</p>
          <p className="text-xs">Run the automation pipeline to generate images</p>
        </div>
      )}

      {/* Lightbox */}
      {selectedShot && (
        <PreviewLightbox shot={selectedShot} onClose={() => setSelectedShot(null)} />
      )}
    </div>
  );
}

// ── Queue Table ───────────────────────────────────────────────

function QueueTable({
  queue,
  media,
  onRetry,
  onSkip,
  onApprove,
  onPreview,
}: {
  queue: AutomationQueueItem[];
  media: Map<string, ShotMedia>;
  onRetry: (shotId: string) => void;
  onSkip: (shotId: string) => void;
  onApprove: (shotId: string, approved: boolean) => void;
  onPreview: (shot: ShotMedia) => void;
}) {
  const [filter, setFilter] = useState<AutomationShotStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "all" ? queue : queue.filter((i) => i.status === filter);

  const statusCounts = queue.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
        <button
          onClick={() => setFilter("all")}
          className={clsx(
            "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
            filter === "all" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white",
          )}
        >
          All ({queue.length})
        </button>
        {(Object.entries(statusCounts) as [AutomationShotStatus, number][]).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status as AutomationShotStatus)}
            className={clsx(
              "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
              filter === status ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white",
            )}
          >
            {STATUS_LABELS[status as AutomationShotStatus]} ({count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-muted">
              <th className="px-3 py-2 font-medium">Preview</th>
              <th className="px-3 py-2 font-medium">Shot</th>
              <th className="px-3 py-2 font-medium">Scene</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Image</th>
              <th className="px-3 py-2 font-medium">Video</th>
              <th className="px-3 py-2 font-medium">Quality</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  {queue.length === 0 ? "Queue is empty — run 'queue-add' to load shots" : "No shots match this filter"}
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const shotMedia = media.get(item.shotId);
              return (
                <tr
                  key={item.shotId}
                  className={clsx(
                    "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]",
                    expanded === item.shotId && "bg-white/[0.02]",
                  )}
                >
                  {/* Thumbnail */}
                  <td className="px-3 py-1.5">
                    {shotMedia?.heroImage ? (
                      <button
                        onClick={() => onPreview(shotMedia)}
                        className="overflow-hidden rounded-md border border-white/[0.08] transition-all hover:border-cyan/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${shotMedia.heroImage}`}
                          alt={item.shotId}
                          className="h-8 w-14 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="flex h-8 w-14 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02]">
                        <ImageIcon size={10} className="text-muted" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setExpanded(expanded === item.shotId ? null : item.shotId)}
                      className="flex items-center gap-1 font-mono text-white hover:text-cyan transition-colors"
                    >
                      {expanded === item.shotId ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {item.shotId}
                    </button>
                    {expanded === item.shotId && (
                      <div className="mt-2 space-y-1 text-muted">
                        <p className="text-[10px] line-clamp-2">{item.prompt}</p>
                        {item.error && <p className="text-[10px] text-red-400">Error: {item.error}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{item.sceneId}</td>
                  <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <ImageIcon size={10} className={shotMedia && shotMedia.images.length > 0 ? "text-success" : item.outputImagePath ? "text-success" : "text-muted"} />
                      <span className="text-muted">{item.imageModel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Video size={10} className={shotMedia && shotMedia.videos.length > 0 ? "text-purple-400" : item.outputVideoPath ? "text-success" : "text-muted"} />
                      <span className="text-muted">{item.videoModel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {item.imageQuality && (
                      <span className={clsx(
                        "font-mono text-[10px]",
                        item.imageQuality.score >= 7 ? "text-success" :
                        item.imageQuality.score >= 5 ? "text-warning" : "text-red-400",
                      )}>
                        {item.imageQuality.score}/10
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {shotMedia && (shotMedia.images.length > 0 || shotMedia.videos.length > 0) && (
                        <button
                          onClick={() => onPreview(shotMedia)}
                          className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
                          title="Preview"
                        >
                          <Maximize2 size={12} />
                        </button>
                      )}
                      {item.status === "failed" && (
                        <button
                          onClick={() => onRetry(item.shotId)}
                          className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
                          title="Retry"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                      {(item.status === "pending" || item.status === "failed") && (
                        <button
                          onClick={() => onSkip(item.shotId)}
                          className="rounded p-1 text-muted hover:text-warning hover:bg-warning/10 transition-colors"
                          title="Skip"
                        >
                          <SkipForward size={12} />
                        </button>
                      )}
                      {item.status === "paused_for_credits" && (
                        <>
                          <button
                            onClick={() => onApprove(item.shotId, true)}
                            className="rounded p-1 text-muted hover:text-success hover:bg-success/10 transition-colors"
                            title="Approve credits"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => onApprove(item.shotId, false)}
                            className="rounded p-1 text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Deny credits"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Event Feed ────────────────────────────────────────────────

function EventFeed({ events }: { events: AutomationEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? events : events.slice(-10);

  const typeIcon = (type: string) => {
    if (type.includes("completed")) return <CheckCircle2 size={12} className="text-success" />;
    if (type.includes("failed") || type.includes("error")) return <XCircle size={12} className="text-red-400" />;
    if (type.includes("retry")) return <RotateCcw size={12} className="text-warning" />;
    if (type.includes("credits")) return <AlertTriangle size={12} className="text-warning" />;
    if (type.includes("started")) return <Play size={12} className="text-cyan" />;
    if (type.includes("stopped")) return <Square size={12} className="text-muted" />;
    return <Activity size={12} className="text-muted" />;
  };

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
          <div key={event.id} className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02]">
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
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductionPage() {
  const { automationStatus, automationQueue, automationEvents, refreshAutomation } = useDashboardStore();
  const [refreshing, setRefreshing] = useState(false);
  const [shotMedia, setShotMedia] = useState<ShotMedia[]>([]);
  const [mediaMap, setMediaMap] = useState<Map<string, ShotMedia>>(new Map());
  const [previewShot, setPreviewShot] = useState<ShotMedia | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/automation/media", { cache: "no-store" });
      if (!res.ok) return;
      const data: ShotMedia[] = await res.json();
      setShotMedia(data);
      const map = new Map<string, ShotMedia>();
      for (const item of data) {
        map.set(item.shotId, item);
      }
      setMediaMap(map);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    refreshAutomation();
    fetchMedia();
    const interval = setInterval(() => {
      refreshAutomation();
      fetchMedia();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAutomation, fetchMedia]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAutomation(), fetchMedia()]);
    setRefreshing(false);
  }, [refreshAutomation, fetchMedia]);

  const handleRetry = useCallback(async (shotId: string) => {
    await automationQueueAction(shotId, "retry");
    await refreshAutomation();
  }, [refreshAutomation]);

  const handleSkip = useCallback(async (shotId: string) => {
    await automationQueueAction(shotId, "skip");
    await refreshAutomation();
  }, [refreshAutomation]);

  const handleApprove = useCallback(async (shotId: string, approved: boolean) => {
    await approveCredits(shotId, approved);
    await refreshAutomation();
  }, [refreshAutomation]);

  const stats = automationStatus?.queueStats;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
            <Zap size={20} className="text-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Production Pipeline</h1>
            <p className="text-xs text-muted">Higgsfield automation — local LLM + Playwright</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-all"
          disabled={refreshing}
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Status + Stats row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ServiceStatusCard status={automationStatus} />
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <QueueStatsBar stats={stats} />
          {(!stats || stats.total === 0) && (
            <div className="text-xs text-muted">
              <p>No queue data. Start the automation service:</p>
              <code className="mt-1 block rounded bg-white/[0.04] px-2 py-1 font-mono text-[10px]">
                cd automation && npm install && npx tsx src/index.ts queue-add --all
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Total", value: stats.total, icon: Clock, color: "text-white" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-success" },
            { label: "In Progress", value: stats.inProgress, icon: Loader2, color: "text-cyan" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-muted" },
            { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-400" },
            { label: "Credits", value: stats.pausedForCredits, icon: AlertTriangle, color: "text-warning" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={12} className={color} />
                <span className="text-[10px] text-muted">{label}</span>
              </div>
              <p className={clsx("mt-1 text-xl font-bold font-mono", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Media Gallery */}
      {shotMedia.length > 0 && (
        <MediaGallery media={shotMedia} onMediaDeleted={fetchMedia} />
      )}

      {/* Main content: Queue table + Event feed */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QueueTable
            queue={automationQueue}
            media={mediaMap}
            onRetry={handleRetry}
            onSkip={handleSkip}
            onApprove={handleApprove}
            onPreview={setPreviewShot}
          />
        </div>
        <div>
          <EventFeed events={automationEvents} />
        </div>
      </div>

      {/* CLI Help */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white mb-2">CLI Commands</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { cmd: "npx tsx src/index.ts start", desc: "Start automation (opens browser)" },
            { cmd: "npx tsx src/index.ts start --headless", desc: "Run headless overnight" },
            { cmd: "npx tsx src/index.ts status", desc: "Check current status" },
            { cmd: "npx tsx src/index.ts queue-add --all", desc: "Load 89 shots into queue" },
            { cmd: "npm run batch-video:dry", desc: "Preview batch video plan" },
            { cmd: "npm run batch-video", desc: "Generate 3 videos per shot (Hailuo, Kling, Seedance)" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
              <code className="block font-mono text-[10px] text-cyan">{cmd}</code>
              <p className="mt-0.5 text-[10px] text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox from queue table preview */}
      {previewShot && (
        <PreviewLightbox shot={previewShot} onClose={() => setPreviewShot(null)} />
      )}
    </div>
  );
}
