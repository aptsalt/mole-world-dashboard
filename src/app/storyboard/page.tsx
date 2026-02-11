"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/store";
import { getSceneColor } from "@/lib/utils";
import type { Scene, Shot } from "@/lib/types";
import {
  BookOpen, ChevronDown, ChevronRight, MapPin, Clock,
  Camera, Users, Sparkles,
} from "lucide-react";

function ShotRow({ shot, index }: { shot: Shot; index: number }) {
  return (
    <div className="flex gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <span className="shrink-0 text-xs font-mono text-muted w-8">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-xs font-mono text-cyan">{shot.shot_id}</code>
          <span className="text-[10px] rounded bg-white/[0.06] px-1.5 py-0.5 text-muted">
            {shot.duration_sec}s
          </span>
          {shot.emotion && (
            <span className="text-[10px] text-amber italic">{shot.emotion}</span>
          )}
        </div>
        <p className="text-xs text-text/70 leading-relaxed line-clamp-2">{shot.action.trim()}</p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <Camera size={10} /> {shot.camera}
          </span>
          {shot.characters_in_frame.length > 0 && (
            <span className="flex items-center gap-1">
              <Users size={10} /> {shot.characters_in_frame.join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SceneAccordion({ scene, isOpen, onToggle }: { scene: Scene; isOpen: boolean; onToggle: () => void }) {
  const color = getSceneColor(scene.scene_id);
  return (
    <div className="glass overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{scene.scene_id}</span>
            <span className="text-xs text-muted">{scene.shots.length} shots</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
            <span className="flex items-center gap-1"><MapPin size={10} /> {scene.location}</span>
            <span className="flex items-center gap-1"><Clock size={10} /> {scene.time}</span>
            <span className="flex items-center gap-1"><Sparkles size={10} /> {scene.mood}</span>
          </div>
        </div>
        {isOpen ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
      </button>
      {isOpen && (
        <div className="border-t border-white/[0.04] px-4 pb-2">
          {scene.shots.map((shot, i) => (
            <ShotRow key={shot.shot_id} shot={shot} index={i} />
          ))}
        </div>
      )}
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
  const scenes: Scene[] = storyboard?.parts?.flatMap((p) => p.scenes) ?? [];
  const totalDuration = scenes.flatMap((s) => s.shots).reduce((sum, sh) => sum + sh.duration_sec, 0);

  return (
    <div className="space-y-6">
      {/* Film Header */}
      {film && (
        <div className="glass p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan/10">
              <BookOpen size={24} className="text-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{film.title}</h1>
              <p className="text-sm text-muted mt-1">{film.logline.trim()}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-cyan">{film.genre}</span>
                <span className="rounded-full bg-amber/10 px-2.5 py-1 text-amber">{film.tone}</span>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-muted">
                  {scenes.length} scenes &middot; {storyboard?.total_shots ?? 0} shots &middot; {totalDuration}s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Characters */}
      {Object.keys(characters).length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Characters</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(characters).map(([name, char]) => (
              <div key={name} className="rounded-lg bg-white/[0.03] p-3">
                <span className="text-xs font-semibold text-cyan capitalize">{name}</span>
                <p className="text-[10px] text-muted mt-1 line-clamp-2">{char.visual_prompt.trim()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenes */}
      <div className="space-y-3">
        {scenes.map((scene) => (
          <SceneAccordion
            key={scene.scene_id}
            scene={scene}
            isOpen={openScenes.has(scene.scene_id)}
            onToggle={() => toggleScene(scene.scene_id)}
          />
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted">
          <BookOpen size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Loading storyboard...</p>
        </div>
      )}
    </div>
  );
}
