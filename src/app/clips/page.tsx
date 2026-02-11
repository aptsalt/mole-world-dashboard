"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/store";
import type { Clip } from "@/lib/types";
import { getSceneColor } from "@/lib/utils";
import {
  Film, Grid3X3, List, CheckCircle2, XCircle,
  Mic, Layers, ChevronDown,
} from "lucide-react";

type ViewMode = "grid" | "list";
type FilterType = "all" | "has_clip" | "has_audio" | "has_composite" | "missing";

function ClipCard({ clip }: { clip: Clip }) {
  const sceneColor = getSceneColor(clip.scene_id);
  return (
    <div className="glass p-4 hover:border-white/[0.12] transition-all group">
      <div className="relative aspect-video rounded-lg bg-white/[0.03] mb-3 overflow-hidden flex items-center justify-center">
        <Film size={24} className="text-white/10" />
        {clip.has_clip && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {clip.clip?.source === "v2_enhanced" && (
            <span className="rounded bg-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan">V2</span>
          )}
          {clip.clip?.source === "v1" && (
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-400">V1</span>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: sceneColor }} />
            <span className="text-sm font-semibold text-white">{clip.shot_id}</span>
          </div>
          <p className="text-xs text-muted mt-1">{clip.scene_id}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {clip.has_clip ? (
            <CheckCircle2 size={12} className="text-success" />
          ) : (
            <XCircle size={12} className="text-error" />
          )}
          {clip.has_audio ? (
            <Mic size={12} className="text-success" />
          ) : (
            <Mic size={12} className="text-white/10" />
          )}
          {clip.has_composite ? (
            <Layers size={12} className="text-success" />
          ) : (
            <Layers size={12} className="text-white/10" />
          )}
        </div>
      </div>
      {clip.clip && (
        <div className="mt-2 text-[10px] text-muted font-mono truncate">
          {clip.clip.filename} ({clip.clip.size_kb.toFixed(0)} KB)
        </div>
      )}
    </div>
  );
}

function ClipRow({ clip }: { clip: Clip }) {
  const sceneColor = getSceneColor(clip.scene_id);
  return (
    <div className="flex items-center gap-4 rounded-lg bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors">
      <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: sceneColor }} />
      <span className="w-24 text-sm font-semibold text-white">{clip.shot_id}</span>
      <span className="w-20 text-xs text-muted">{clip.scene_id}</span>
      <div className="flex items-center gap-2 flex-1">
        {clip.has_clip ? (
          <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 size={12} /> Video</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-error"><XCircle size={12} /> Video</span>
        )}
        {clip.has_audio ? (
          <span className="flex items-center gap-1 text-xs text-success"><Mic size={12} /> Audio</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted"><Mic size={12} /> Audio</span>
        )}
        {clip.has_composite ? (
          <span className="flex items-center gap-1 text-xs text-success"><Layers size={12} /> Comp</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted"><Layers size={12} /> Comp</span>
        )}
      </div>
      <span className="text-xs text-muted font-mono">
        {clip.clip ? `${clip.clip.size_kb.toFixed(0)} KB` : "--"}
      </span>
      <span className="text-[10px] rounded px-1.5 py-0.5 font-semibold uppercase"
        style={{
          background: clip.clip?.source === "v2_enhanced" ? "rgba(0,212,255,0.15)" : "rgba(59,130,246,0.15)",
          color: clip.clip?.source === "v2_enhanced" ? "#00d4ff" : "#3b82f6",
        }}>
        {clip.clip?.source === "v2_enhanced" ? "V2" : "V1"}
      </span>
    </div>
  );
}

export default function ClipsPage() {
  const { clips, refreshAll } = useDashboardStore();
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (clips.length === 0) refreshAll();
  }, [clips.length, refreshAll]);

  const filtered = clips.filter((clip) => {
    if (filter === "has_clip") return clip.has_clip;
    if (filter === "has_audio") return clip.has_audio;
    if (filter === "has_composite") return clip.has_composite;
    if (filter === "missing") return !clip.has_clip;
    return true;
  });

  const withClip = clips.filter((c) => c.has_clip).length;
  const withAudio = clips.filter((c) => c.has_audio).length;
  const withComp = clips.filter((c) => c.has_composite).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clips</h1>
          <p className="text-sm text-muted mt-1">
            {clips.length} shots &middot; {withClip} with video &middot; {withAudio} with audio &middot; {withComp} composited
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="appearance-none rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 pr-8 text-xs text-muted focus:outline-none focus:border-cyan/30"
            >
              <option value="all">All Clips</option>
              <option value="has_clip">Has Video</option>
              <option value="has_audio">Has Audio</option>
              <option value="has_composite">Composited</option>
              <option value="missing">Missing Video</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <div className="flex rounded-lg bg-white/[0.06] p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`rounded-md p-1.5 transition-colors ${view === "grid" ? "bg-white/[0.1] text-cyan" : "text-muted hover:text-white"}`}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md p-1.5 transition-colors ${view === "list" ? "bg-white/[0.1] text-cyan" : "text-muted hover:text-white"}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((clip) => (
            <ClipCard key={clip.shot_id} clip={clip} />
          ))}
        </div>
      ) : (
        <div className="glass p-2 space-y-1">
          {filtered.map((clip) => (
            <ClipRow key={clip.shot_id} clip={clip} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted">
          <Film size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No clips match the current filter</p>
        </div>
      )}
    </div>
  );
}
