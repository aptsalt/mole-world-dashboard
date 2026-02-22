"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Layers,
  Maximize2,
  Grid,
  List,
  Trash2,
  CheckSquare,
  Square as SquareIcon,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { PreviewLightbox } from "@/components/production/preview-lightbox";
import type { ShotMedia } from "@/components/production/preview-lightbox";
import { VideoPreview } from "@/components/ui/video-preview";

/** Check if a file path is a video file */
function isVideoFile(path: string): boolean {
  return /\.(mp4|webm)$/i.test(path);
}

// ── Component ────────────────────────────────────────

export function MediaGallery({ media, onMediaDeleted }: { media: ShotMedia[]; onMediaDeleted: () => void }) {
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
                  const firstVideo = shot.videos.find((v) => isVideoFile(v));

                  // Show VideoPreview for shots with video files
                  if (firstVideo) {
                    return (
                      <>
                        <VideoPreview
                          src={`/api/media/${firstVideo}`}
                          poster={thumb ? `/api/media/${thumb}` : undefined}
                          alt={shot.shotId}
                          aspectRatio="video"
                          className={clsx(
                            "w-full transition-transform group-hover:scale-105",
                            selectMode && shot.images.every((p) => selectedPaths.has(p)) && shot.images.length > 0 && "opacity-60 ring-2 ring-cyan ring-inset",
                          )}
                          onExpand={() => setSelectedShot(shot)}
                        />
                        {label && (
                          <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                            {label}
                          </span>
                        )}
                      </>
                    );
                  }

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
                    const firstVideo = shot.videos.find((v) => isVideoFile(v));

                    if (firstVideo) {
                      return (
                        <VideoPreview
                          src={`/api/media/${firstVideo}`}
                          poster={thumb ? `/api/media/${thumb}` : undefined}
                          alt={shot.shotId}
                          aspectRatio="auto"
                          showControls={false}
                          className="h-10 w-16"
                        />
                      );
                    }

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
