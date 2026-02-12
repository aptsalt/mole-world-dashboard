"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDashboardStore } from "@/lib/store";
import type { Clip, Shot } from "@/lib/types";
import { getSceneColor } from "@/lib/utils";
import {
  Film, Mic, Layers, Search, X,
  ChevronLeft, ChevronRight, Grid3X3, List,
  Maximize2, BarChart3, LayoutGrid,
  CheckSquare, Square, Download, Trash2,
  ArrowLeftRight, Play, Pause,
} from "lucide-react";
import { ClipComparison } from "@/components/ui/clip-comparison";
import { useMiniPlayer } from "@/components/ui/mini-player";
import type { MiniPlayerClip } from "@/components/ui/mini-player";
import { ClipsSkeleton } from "@/components/ui/skeleton";
import { getVideoUrl, getAudioUrl } from "@/lib/api";

type ViewMode = "grid" | "list" | "mosaic";
type StatusFilter = "all" | "has_clip" | "has_audio" | "has_composite" | "missing";
type SortMode = "shot_order" | "size_desc";

const selectClass =
  "appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none";

function buildMiniPlayerClip(clip: Clip): MiniPlayerClip {
  return {
    shotId: clip.shot_id,
    sceneId: clip.scene_id,
    source: clip.clip?.source,
    videoUrl: clip.clip?.relative_path ? getVideoUrl(clip.clip.relative_path) : undefined,
    audioUrl: clip.audio?.relative_path ? getAudioUrl(clip.audio.relative_path) : undefined,
  };
}

function clipVideoUrl(clip: Clip): string | null {
  return clip.clip?.relative_path ? getVideoUrl(clip.clip.relative_path) : null;
}

function FilmTimeline({ clips }: { clips: Clip[] }) {
  return (
    <div className="w-full h-3 rounded-full overflow-hidden flex gap-px" title="Film timeline">
      {clips.map((clip) => (
        <div
          key={clip.shot_id}
          className="h-full relative group transition-all hover:brightness-125"
          style={{
            flex: 1,
            background: clip.has_clip ? getSceneColor(clip.scene_id) : "rgba(255,255,255,0.06)",
            opacity: clip.has_clip ? 0.85 : 0.3,
          }}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-black/90 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
            {clip.shot_id}
          </div>
        </div>
      ))}
    </div>
  );
}

function ShotDrawer({
  clip,
  clips,
  storyboardShot,
  onClose,
  onNavigate,
  onCompare,
  onPlay,
}: {
  clip: Clip;
  clips: Clip[];
  storyboardShot: Shot | null;
  onClose: () => void;
  onNavigate: (shotId: string) => void;
  onCompare: (shotId: string) => void;
  onPlay: (clip: Clip) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const currentIndex = clips.findIndex((c) => c.shot_id === clip.shot_id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < clips.length - 1;
  const sceneColor = getSceneColor(clip.scene_id);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      video.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  // Reset play state when navigating to a different clip
  useEffect(() => {
    setPlaying(false);
  }, [clip.shot_id]);

  // Pause on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(clips[currentIndex - 1].shot_id);
      if (e.key === "ArrowRight" && hasNext) onNavigate(clips[currentIndex + 1].shot_id);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNavigate, clips, currentIndex, hasPrev, hasNext]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ background: sceneColor }} />
            <h2 className="text-lg font-bold text-white">{clip.shot_id}</h2>
            {clip.clip?.source && (
              <span className={`badge ${clip.clip.source === "v2" ? "badge-v2" : "badge-v1"}`}>
                {clip.clip.source === "v2" ? "V2" : "V1"}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Video preview */}
        <div className="aspect-video rounded-xl bg-black border border-white/[0.06] flex items-center justify-center relative group/video overflow-hidden">
          {clipVideoUrl(clip) ? (
            <video
              ref={videoRef}
              src={clipVideoUrl(clip)!}
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <Film size={32} className="text-white/10" />
          )}
          {clip.has_clip && clipVideoUrl(clip) && (
            <button
              onClick={togglePlay}
              className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${playing ? "opacity-0 hover:opacity-100" : "opacity-0 group-hover/video:opacity-100"}`}
            >
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                {playing ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
              </div>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {clip.has_clip && (
            <button
              onClick={() => {
                videoRef.current?.pause();
                setPlaying(false);
                onPlay(clip);
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-cyan/10 border border-cyan/20 py-2 text-xs font-medium text-cyan hover:bg-cyan/15 transition-all"
            >
              <Play size={14} />
              Mini Player
            </button>
          )}
          {clip.clip?.source === "v2" && (
            <button
              onClick={() => onCompare(clip.shot_id)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber/10 border border-amber/20 py-2 text-xs font-medium text-amber hover:bg-amber/15 transition-all"
            >
              <ArrowLeftRight size={14} />
              Compare V1/V2
            </button>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetaItem label="Scene" value={clip.scene_id} />
          <MetaItem
            label="Status"
            value={clip.has_clip ? (clip.has_composite ? "Composited" : "Has Video") : "Missing"}
          />
          <MetaItem label="Source" value={clip.clip?.source === "v2" ? "V2 Enhanced" : clip.clip?.source ?? "N/A"} />
          <MetaItem label="File Size" value={clip.clip ? `${clip.clip.size_kb.toFixed(0)} KB` : "N/A"} />
        </div>

        {/* Storyboard data */}
        {storyboardShot && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Storyboard</h3>
            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Camera" value={storyboardShot.camera} />
              <MetaItem label="Emotion" value={storyboardShot.emotion} />
              <MetaItem label="Characters" value={storyboardShot.characters_in_frame.join(", ") || "None"} />
              <MetaItem label="Action" value={storyboardShot.action} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <button
            disabled={!hasPrev}
            onClick={() => hasPrev && onNavigate(clips[currentIndex - 1].shot_id)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-[10px] text-muted font-mono">
            {currentIndex + 1} / {clips.length}
          </span>
          <button
            disabled={!hasNext}
            onClick={() => hasNext && onNavigate(clips[currentIndex + 1].shot_id)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

function CinemaModal({
  clip,
  clips,
  storyboardShot,
  onClose,
  onNavigate,
}: {
  clip: Clip;
  clips: Clip[];
  storyboardShot: Shot | null;
  onClose: () => void;
  onNavigate: (shotId: string) => void;
}) {
  const currentIndex = clips.findIndex((c) => c.shot_id === clip.shot_id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < clips.length - 1;
  const sceneColor = getSceneColor(clip.scene_id);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(clips[currentIndex - 1].shot_id);
      if (e.key === "ArrowRight" && hasNext) onNavigate(clips[currentIndex + 1].shot_id);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNavigate, clips, currentIndex, hasPrev, hasNext]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 350 }}>
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-muted hover:text-white transition-colors flex items-center gap-2 text-sm"
        >
          <span className="kbd">ESC</span>
          Close
        </button>

        {/* Main content */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
          {/* Video area */}
          <div className="aspect-video bg-black flex items-center justify-center relative">
            {clipVideoUrl(clip) ? (
              <video
                src={clipVideoUrl(clip)!}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="h-full w-full object-contain"
              />
            ) : (
              <>
                <Film size={64} className="text-white/5" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white/40">{clip.shot_id}</p>
                    <p className="text-sm text-white/20 mt-1">{storyboardShot?.action ?? clip.scene_id}</p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation arrows */}
            {hasPrev && (
              <button
                onClick={() => onNavigate(clips[currentIndex - 1].shot_id)}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => onNavigate(clips[currentIndex + 1].shot_id)}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: sceneColor }} />
              {clip.clip?.source && (
                <span className={`badge ${clip.clip.source === "v2" ? "badge-v2" : "badge-v1"}`}>
                  {clip.clip.source === "v2" ? "V2 Enhanced" : "V1 Standard"}
                </span>
              )}
            </div>

            {/* Counter */}
            <div className="absolute bottom-4 right-4 text-xs font-mono text-white/40 bg-black/50 px-2.5 py-1 rounded-lg border border-white/5">
              {currentIndex + 1} / {clips.length}
            </div>
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#0d0d18] border-t border-white/[0.06]">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{clip.shot_id}</p>
                <p className="text-xs text-muted">{clip.scene_id}</p>
              </div>
              {storyboardShot && (
                <>
                  <div className="h-8 w-px bg-white/[0.06]" />
                  <div className="text-xs text-muted max-w-[300px] truncate">
                    {storyboardShot.camera} &middot; {storyboardShot.emotion}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1 text-xs ${clip.has_clip ? "text-success" : "text-muted"}`}>
                <Film size={12} />
              </span>
              <span className={`flex items-center gap-1 text-xs ${clip.has_audio ? "text-success" : "text-muted"}`}>
                <Mic size={12} />
              </span>
              <span className={`flex items-center gap-1 text-xs ${clip.has_composite ? "text-success" : "text-muted"}`}>
                <Layers size={12} />
              </span>
              {clip.clip && (
                <span className="text-xs font-mono text-muted">{clip.clip.size_kb.toFixed(0)} KB</span>
              )}
            </div>
          </div>
        </div>

        {/* Film strip below */}
        <div className="cinema-strip flex gap-1 mt-3 h-2 rounded-full overflow-hidden">
          {clips.map((c, i) => (
            <button
              key={c.shot_id}
              onClick={() => onNavigate(c.shot_id)}
              className="h-full transition-all hover:brightness-150"
              style={{
                flex: 1,
                background: i === currentIndex
                  ? "#00d4ff"
                  : c.has_clip
                    ? getSceneColor(c.scene_id)
                    : "rgba(255,255,255,0.06)",
                opacity: i === currentIndex ? 1 : c.has_clip ? 0.5 : 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-white truncate">{value}</p>
    </div>
  );
}

function ClipCard({ clip, onClick, onCinema }: { clip: Clip; onClick: () => void; onCinema: () => void }) {
  const sceneColor = getSceneColor(clip.scene_id);
  return (
    <div className="clip-card glass p-4 group" onClick={onClick}>
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-lg bg-black mb-3 overflow-hidden flex items-center justify-center">
        {clipVideoUrl(clip) ? (
          <video
            src={clipVideoUrl(clip)!}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <Film size={24} className="text-white/10" />
        )}
        {clip.has_clip && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {clip.clip?.source && (
            <span className={`badge ${clip.clip.source === "v2" ? "badge-v2" : "badge-v1"}`}>
              {clip.clip.source === "v2" ? "V2" : "V1"}
            </span>
          )}
        </div>
        {/* Cinema mode button */}
        <button
          onClick={(e) => { e.stopPropagation(); onCinema(); }}
          className="absolute bottom-2 right-2 h-7 w-7 rounded-md bg-black/60 border border-white/10 flex items-center justify-center text-white/40 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/80 transition-all"
          title="Cinema mode"
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: sceneColor }} />
            <span className="text-sm font-semibold text-white">{clip.shot_id}</span>
          </div>
          <p className="text-xs text-muted mt-1">{clip.scene_id}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Film size={12} className={clip.has_clip ? "text-success" : "text-white/10"} />
          <Mic size={12} className={clip.has_audio ? "text-success" : "text-white/10"} />
          <Layers size={12} className={clip.has_composite ? "text-success" : "text-white/10"} />
        </div>
      </div>

      {clip.clip && (
        <div className="mt-2 text-[10px] text-muted font-mono truncate">
          {clip.clip.size_kb.toFixed(0)} KB
        </div>
      )}
    </div>
  );
}

function ClipRow({ clip, onClick }: { clip: Clip; onClick: () => void }) {
  const sceneColor = getSceneColor(clip.scene_id);
  return (
    <div
      className="flex items-center gap-4 rounded-lg bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer row-hover"
      onClick={onClick}
    >
      <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: sceneColor }} />
      <span className="w-24 text-sm font-semibold text-white">{clip.shot_id}</span>
      <span className="w-20 text-xs text-muted">{clip.scene_id}</span>
      <div className="flex items-center gap-2 flex-1">
        <span className={`flex items-center gap-1 text-xs ${clip.has_clip ? "text-success" : "text-muted"}`}>
          <Film size={12} /> Video
        </span>
        <span className={`flex items-center gap-1 text-xs ${clip.has_audio ? "text-success" : "text-muted"}`}>
          <Mic size={12} /> Audio
        </span>
        <span className={`flex items-center gap-1 text-xs ${clip.has_composite ? "text-success" : "text-muted"}`}>
          <Layers size={12} /> Comp
        </span>
      </div>
      <span className="text-xs text-muted font-mono">
        {clip.clip ? `${clip.clip.size_kb.toFixed(0)} KB` : "--"}
      </span>
      {clip.clip?.source && (
        <span className={`badge ${clip.clip.source === "v2" ? "badge-v2" : "badge-v1"}`}>
          {clip.clip.source === "v2" ? "V2" : "V1"}
        </span>
      )}
    </div>
  );
}

function ClipMosaicItem({ clip, selected, onSelect, onClick }: {
  clip: Clip; selected: boolean; onSelect: (shotId: string) => void; onClick: () => void;
}) {
  const sceneColor = getSceneColor(clip.scene_id);
  return (
    <div
      className="mosaic-tile relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
      style={{
        background: clip.has_clip
          ? `linear-gradient(135deg, ${sceneColor}40, ${sceneColor}10)`
          : "rgba(255,255,255,0.02)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "rgba(0,212,255,0.6)" : "rgba(255,255,255,0.06)",
      }}
      onClick={onClick}
    >
      {/* Select checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(clip.shot_id); }}
        className="absolute top-1.5 left-1.5 z-10 text-white/20 hover:text-cyan transition-colors opacity-0 group-hover:opacity-100"
      >
        {selected ? <CheckSquare size={14} className="text-cyan" /> : <Square size={14} />}
      </button>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-1.5">
        {clip.has_clip ? (
          <Film size={16} className="text-white/20 mb-1" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-dashed border-white/10 mb-1" />
        )}
        <span className="text-[8px] font-mono text-white/50 text-center leading-tight truncate w-full">
          {clip.shot_id.replace("P1_", "")}
        </span>
      </div>

      {/* Status indicators */}
      <div className="absolute bottom-1 right-1 flex gap-0.5">
        {clip.has_clip && <div className="h-1.5 w-1.5 rounded-full bg-success" />}
        {clip.has_audio && <div className="h-1.5 w-1.5 rounded-full bg-cyan" />}
        {clip.has_composite && <div className="h-1.5 w-1.5 rounded-full bg-amber" />}
      </div>

      {/* Source badge */}
      {clip.clip?.source === "v2" && (
        <div className="absolute top-1 right-1">
          <span className="text-[7px] font-bold text-amber bg-amber/20 rounded px-1">V2</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function BulkActionsBar({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div className="glass glow-cyan p-3 flex items-center gap-4 animate-slide-up">
      <div className="flex items-center gap-2">
        <CheckSquare size={14} className="text-cyan" />
        <span className="text-sm font-semibold text-white">{count} selected</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <button className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.15] transition-all">
          <Download size={12} />
          Export
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-error/10 border border-error/20 px-3 py-1.5 text-xs text-error hover:bg-error/20 transition-all">
          <Trash2 size={12} />
          Remove
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted hover:text-white transition-colors"
        >
          <X size={12} />
          Clear
        </button>
      </div>
    </div>
  );
}

export default function ClipsPage() {
  const { clips, storyboard, refreshAll } = useDashboardStore();
  const miniPlayer = useMiniPlayer();
  const [view, setView] = useState<ViewMode>("grid");
  const [sceneFilter, setSceneFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("shot_order");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [cinemaShotId, setCinemaShotId] = useState<string | null>(null);
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  const [compareShotId, setCompareShotId] = useState<string | null>(null);

  useEffect(() => {
    if (clips.length === 0) refreshAll();
  }, [clips.length, refreshAll]);

  // Build scene list
  const sceneIds = useMemo(() => {
    const set = new Set(clips.map((c) => c.scene_id));
    return Array.from(set).sort();
  }, [clips]);

  // Build storyboard shot lookup
  const shotLookup = useMemo(() => {
    const map = new Map<string, Shot>();
    if (!storyboard) return map;
    for (const part of storyboard.parts) {
      for (const scene of part.scenes) {
        for (const shot of scene.shots) {
          map.set(shot.shot_id, shot);
        }
      }
    }
    return map;
  }, [storyboard]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = clips.filter((clip) => {
      if (sceneFilter !== "all" && clip.scene_id !== sceneFilter) return false;
      if (sourceFilter === "v1" && clip.clip?.source !== "v1" && !clip.v1_clip) return false;
      if (sourceFilter === "v2" && clip.clip?.source !== "v2") return false;
      if (statusFilter === "has_clip" && !clip.has_clip) return false;
      if (statusFilter === "has_audio" && !clip.has_audio) return false;
      if (statusFilter === "has_composite" && !clip.has_composite) return false;
      if (statusFilter === "missing" && clip.has_clip) return false;
      if (searchQuery && !clip.shot_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    if (sortMode === "shot_order") {
      result = [...result].sort((a, b) => a.shot_id.localeCompare(b.shot_id));
    } else {
      result = [...result].sort((a, b) => (b.clip?.size_kb ?? 0) - (a.clip?.size_kb ?? 0));
    }

    return result;
  }, [clips, sceneFilter, sourceFilter, statusFilter, searchQuery, sortMode]);

  // Stats
  const withClip = clips.filter((c) => c.has_clip).length;
  const withAudio = clips.filter((c) => c.has_audio).length;
  const withComp = clips.filter((c) => c.has_composite).length;

  // Drawer
  const selectedClip = selectedShotId ? clips.find((c) => c.shot_id === selectedShotId) ?? null : null;
  const handleNavigate = useCallback((shotId: string) => setSelectedShotId(shotId), []);
  const handleClose = useCallback(() => setSelectedShotId(null), []);

  // Cinema modal
  const cinemaClip = cinemaShotId ? clips.find((c) => c.shot_id === cinemaShotId) ?? null : null;
  const handleCinemaNavigate = useCallback((shotId: string) => setCinemaShotId(shotId), []);
  const handleCinemaClose = useCallback(() => setCinemaShotId(null), []);

  const toggleSelect = useCallback((shotId: string) => {
    setSelectedShots((prev) => {
      const next = new Set(prev);
      if (next.has(shotId)) next.delete(shotId);
      else next.add(shotId);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedShots(new Set()), []);

  if (clips.length === 0) return <ClipsSkeleton />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass stat-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Film size={14} className="text-cyan" />
            <span className="text-[10px] text-muted uppercase tracking-wider">Total Shots</span>
          </div>
          <p className="text-2xl font-bold text-white number-pop">{clips.length}</p>
        </div>
        <div className="glass stat-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Film size={14} className="text-success" />
            <span className="text-[10px] text-muted uppercase tracking-wider">With Video</span>
          </div>
          <p className="text-2xl font-bold text-success number-pop">{withClip}</p>
        </div>
        <div className="glass stat-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mic size={14} className="text-cyan" />
            <span className="text-[10px] text-muted uppercase tracking-wider">With Audio</span>
          </div>
          <p className="text-2xl font-bold text-cyan number-pop">{withAudio}</p>
        </div>
        <div className="glass stat-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-amber" />
            <span className="text-[10px] text-muted uppercase tracking-wider">Completion</span>
          </div>
          <p className="text-2xl font-bold text-amber number-pop">
            {clips.length > 0 ? Math.round((withClip / clips.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Film Timeline Bar */}
      <FilmTimeline clips={clips} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={sceneFilter} onChange={(e) => setSceneFilter(e.target.value)} className={selectClass}>
          <option value="all">All Scenes</option>
          {sceneIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={selectClass}>
          <option value="all">All Sources</option>
          <option value="v1">V1</option>
          <option value="v2">V2</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={selectClass}>
          <option value="all">All Status</option>
          <option value="has_clip">Has Video</option>
          <option value="has_audio">Has Audio</option>
          <option value="has_composite">Composited</option>
          <option value="missing">Missing</option>
        </select>

        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className={selectClass}>
          <option value="shot_order">Shot Order</option>
          <option value="size_desc">File Size</option>
        </select>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shots..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-36"
          />
        </div>

        <div className="ml-auto flex rounded-lg bg-white/[0.06] p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`rounded-md p-1.5 transition-colors ${view === "grid" ? "bg-white/[0.1] text-cyan" : "text-muted hover:text-white"}`}
            title="Grid view"
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => setView("mosaic")}
            className={`rounded-md p-1.5 transition-colors ${view === "mosaic" ? "bg-white/[0.1] text-cyan" : "text-muted hover:text-white"}`}
            title="Mosaic view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md p-1.5 transition-colors ${view === "list" ? "bg-white/[0.1] text-cyan" : "text-muted hover:text-white"}`}
            title="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <p className="text-sm text-muted">
        <span className="text-white font-semibold">{clips.length}</span> shots{" "}
        &middot; <span className="text-success font-semibold">{withClip}</span> with video{" "}
        &middot; <span className="text-cyan font-semibold">{withAudio}</span> with audio{" "}
        &middot; <span className="text-amber font-semibold">{withComp}</span> composited
      </p>

      {/* Bulk Actions Bar */}
      {selectedShots.size > 0 && (
        <BulkActionsBar count={selectedShots.size} onClear={clearSelection} />
      )}

      {/* Grid / Mosaic / List */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((clip) => (
            <ClipCard
              key={clip.shot_id}
              clip={clip}
              onClick={() => setSelectedShotId(clip.shot_id)}
              onCinema={() => setCinemaShotId(clip.shot_id)}
            />
          ))}
        </div>
      ) : view === "mosaic" ? (
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15">
          {filtered.map((clip) => (
            <ClipMosaicItem
              key={clip.shot_id}
              clip={clip}
              selected={selectedShots.has(clip.shot_id)}
              onSelect={toggleSelect}
              onClick={() => setSelectedShotId(clip.shot_id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass p-2 space-y-1">
          {filtered.map((clip) => (
            <ClipRow key={clip.shot_id} clip={clip} onClick={() => setSelectedShotId(clip.shot_id)} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted">
          <Film size={32} className="mb-3 opacity-30 empty-state-icon" />
          <p className="text-sm">No clips match the current filters</p>
        </div>
      )}

      {/* Shot Detail Drawer */}
      {selectedClip && (
        <ShotDrawer
          clip={selectedClip}
          clips={filtered}
          storyboardShot={shotLookup.get(selectedClip.shot_id) ?? null}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onCompare={(shotId) => setCompareShotId(shotId)}
          onPlay={(c) => {
            const playlist = filtered.filter((f) => f.has_clip).map(buildMiniPlayerClip);
            miniPlayer.open(buildMiniPlayerClip(c), playlist);
          }}
        />
      )}

      {/* Cinema Modal */}
      {cinemaClip && (
        <CinemaModal
          clip={cinemaClip}
          clips={filtered}
          storyboardShot={shotLookup.get(cinemaClip.shot_id) ?? null}
          onClose={handleCinemaClose}
          onNavigate={handleCinemaNavigate}
        />
      )}

      {/* Clip Comparison Slider */}
      {compareShotId && (() => {
        const compareClip = clips.find((c) => c.shot_id === compareShotId);
        if (!compareClip) return null;
        return (
          <ClipComparison
            clip={compareClip}
            onClose={() => setCompareShotId(null)}
          />
        );
      })()}
    </div>
  );
}
