"use client";

import { useEffect, useState, useMemo } from "react";
import { useDashboardStore } from "@/lib/store";
import { getSceneColor } from "@/lib/utils";
import type { Scene, Shot } from "@/lib/types";
import {
  BookOpen, ChevronDown, ChevronRight, MapPin, Clock,
  Camera, Users, Sparkles, ChevronsUpDown, Film,
  Eye, Heart,
} from "lucide-react";
import { StoryboardSkeleton } from "@/components/ui/skeleton";

function ShotRow({ shot, index, sceneColor }: { shot: Shot; index: number; sceneColor: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex gap-4 py-3 border-b border-white/[0.04] last:border-0 group/shot hover:bg-white/[0.01] transition-colors rounded-lg px-2 cursor-pointer"
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="shrink-0 flex flex-col items-center gap-1">
        <span className="text-xs font-mono text-muted w-6 text-center">{index + 1}</span>
        <div className="h-full w-px bg-white/[0.06]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: sceneColor }} />
          <code className="text-xs font-mono text-cyan">{shot.shot_id}</code>
          <span className="text-[10px] rounded-full bg-white/[0.06] px-2 py-0.5 text-muted font-mono">
            {shot.duration_sec}s
          </span>
          {shot.emotion && (
            <span className="flex items-center gap-1 text-[10px] text-amber italic">
              <Heart size={8} /> {shot.emotion}
            </span>
          )}
        </div>
        <p className="text-xs text-text/70 leading-relaxed">{shot.action.trim()}</p>
        <div className="mt-2 flex items-center gap-4 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <Camera size={10} className="text-cyan/60" /> {shot.camera}
          </span>
          {shot.characters_in_frame.length > 0 && (
            <span className="flex items-center gap-1">
              <Users size={10} className="text-amber/60" /> {shot.characters_in_frame.join(", ")}
            </span>
          )}
        </div>
        {/* Expanded: Full shot details */}
        {expanded && (
          <div className="mt-3 rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Visual Prompt</p>
              <p className="text-xs text-white/70 leading-relaxed italic">
                {shot.action.trim()}
              </p>
            </div>
            <div className="flex items-center gap-4 pt-1 border-t border-white/[0.04]">
              <div>
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Camera</p>
                <p className="text-xs text-cyan/80">{shot.camera}</p>
              </div>
              {shot.emotion && (
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Emotion</p>
                  <p className="text-xs text-amber/80">{shot.emotion}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Duration</p>
                <p className="text-xs text-white/70">{shot.duration_sec}s</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SceneAccordion({ scene, isOpen, onToggle, shotCount }: {
  scene: Scene; isOpen: boolean; onToggle: () => void; shotCount: number;
}) {
  const color = getSceneColor(scene.scene_id);
  const totalDuration = scene.shots.reduce((sum, s) => sum + s.duration_sec, 0);

  return (
    <div className="glass overflow-hidden transition-all hover:border-white/[0.12]">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
          <Film size={18} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">{scene.scene_id}</span>
            <span className="text-[10px] rounded-full bg-white/[0.06] px-2 py-0.5 text-muted">
              {scene.shots.length} shots
            </span>
            <span className="text-[10px] rounded-full bg-white/[0.06] px-2 py-0.5 text-muted font-mono">
              {totalDuration}s
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted">
            <span className="flex items-center gap-1"><MapPin size={10} className="text-cyan/60" /> {scene.location}</span>
            <span className="flex items-center gap-1"><Clock size={10} className="text-amber/60" /> {scene.time}</span>
            <span className="flex items-center gap-1"><Sparkles size={10} style={{ color }} /> {scene.mood}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Mini progress bar */}
          <div className="hidden sm:block w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "100%", background: color }} />
          </div>
          {isOpen ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-white/[0.04] px-4 pb-3 pt-1">
          {scene.shots.map((shot, i) => (
            <ShotRow key={shot.shot_id} shot={shot} index={i} sceneColor={color} />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneTimeline({ scenes }: { scenes: Scene[] }) {
  const totalDuration = scenes.reduce(
    (sum, s) => sum + s.shots.reduce((ss, sh) => ss + sh.duration_sec, 0), 0
  );

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-3">
        <Eye size={14} className="text-cyan" />
        <h3 className="text-sm font-semibold text-white section-heading">Scene Timeline</h3>
        <span className="ml-auto text-[10px] text-muted font-mono">{totalDuration}s total</span>
      </div>
      <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
        {scenes.map((scene) => {
          const dur = scene.shots.reduce((sum, s) => sum + s.duration_sec, 0);
          const pct = totalDuration > 0 ? (dur / totalDuration) * 100 : 0;
          const color = getSceneColor(scene.scene_id);
          return (
            <div
              key={scene.scene_id}
              className="group relative transition-all hover:brightness-125 cursor-pointer"
              style={{ width: `${pct}%`, background: color, minWidth: "4px", opacity: 0.8 }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <span className="text-[9px] font-mono text-white bg-black/90 px-2 py-1 rounded whitespace-nowrap border border-white/10">
                  {scene.scene_id} &middot; {dur}s
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {scenes.map((scene) => (
          <span key={scene.scene_id} className="flex items-center gap-1 text-[10px] text-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: getSceneColor(scene.scene_id) }} />
            {scene.scene_id}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StoryboardPage() {
  const { storyboard, refreshAll } = useDashboardStore();
  const [openScenes, setOpenScenes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!storyboard) refreshAll();
  }, [storyboard, refreshAll]);

  const toggleScene = (sceneId: string) => {
    setOpenScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  };

  const film = storyboard?.film;
  const characters = storyboard?.characters ?? {};
  const scenes: Scene[] = useMemo(
    () => storyboard?.parts?.flatMap((p) => p.scenes) ?? [],
    [storyboard]
  );
  const totalDuration = useMemo(
    () => scenes.flatMap((s) => s.shots).reduce((sum, sh) => sum + sh.duration_sec, 0),
    [scenes]
  );
  const totalShots = useMemo(
    () => scenes.reduce((sum, s) => sum + s.shots.length, 0),
    [scenes]
  );

  const allOpen = scenes.length > 0 && openScenes.size === scenes.length;
  const toggleAll = () => {
    if (allOpen) {
      setOpenScenes(new Set());
    } else {
      setOpenScenes(new Set(scenes.map((s) => s.scene_id)));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Film Header */}
      {film && (
        <div className="glass glow-cyan p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan/10">
              <BookOpen size={24} className="text-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{film.title}</h1>
              <p className="text-sm text-muted mt-1 leading-relaxed">{film.logline.trim()}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-cyan border border-cyan/20">{film.genre}</span>
                <span className="rounded-full bg-amber/10 px-2.5 py-1 text-amber border border-amber/20">{film.tone}</span>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-muted border border-white/[0.08]">
                  {scenes.length} scenes
                </span>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-muted border border-white/[0.08]">
                  {totalShots} shots
                </span>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-muted border border-white/[0.08] font-mono">
                  {totalDuration}s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scene Timeline */}
      {scenes.length > 0 && <SceneTimeline scenes={scenes} />}

      {/* Characters */}
      {Object.keys(characters).length > 0 && (
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-amber" />
            <h3 className="text-sm font-semibold text-white section-heading">Characters</h3>
            <span className="text-[10px] text-muted">{Object.keys(characters).length} characters</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(characters).map(([name, char]) => (
              <div key={name} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan/10">
                    <Users size={12} className="text-cyan" />
                  </div>
                  <span className="text-sm font-semibold text-white capitalize">{name}</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed line-clamp-3">{char.visual_prompt.trim()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenes Header + Toggle */}
      {scenes.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Scenes <span className="text-muted font-normal">({scenes.length})</span>
          </h2>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-cyan transition-colors"
          >
            <ChevronsUpDown size={14} />
            {allOpen ? "Collapse All" : "Expand All"}
          </button>
        </div>
      )}

      {/* Scenes */}
      <div className="space-y-3 stagger-list">
        {scenes.map((scene) => (
          <SceneAccordion
            key={scene.scene_id}
            scene={scene}
            isOpen={openScenes.has(scene.scene_id)}
            onToggle={() => toggleScene(scene.scene_id)}
            shotCount={totalShots}
          />
        ))}
      </div>

      {scenes.length === 0 && <StoryboardSkeleton />}
    </div>
  );
}
