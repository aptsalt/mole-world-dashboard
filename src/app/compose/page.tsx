"use client";

import { useState, useEffect, useMemo } from "react";
import { Film, Sliders, Sparkles, Monitor, Play, Clock, FileVideo, CheckCircle, AlertCircle, Layers } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { getSceneColor, formatDuration } from "@/lib/utils";

type Preset = "preview" | "standard" | "high";

const PRESETS: { key: Preset; label: string; desc: string }[] = [
  { key: "preview", label: "Preview", desc: "480p \u00b7 Fast render \u00b7 No effects" },
  { key: "standard", label: "Standard", desc: "720p \u00b7 Crossfade \u00b7 Narration overlay" },
  { key: "high", label: "High Quality", desc: "1080p \u00b7 Color grading \u00b7 Full audio mix" },
];

export default function ComposePage() {
  const { storyboard, clips, refreshAll } = useDashboardStore();

  const [preset, setPreset] = useState<Preset>("standard");
  const [crossfade, setCrossfade] = useState(0.5);
  const [includeNarration, setIncludeNarration] = useState(true);
  const [colorGrading, setColorGrading] = useState(false);

  useEffect(() => {
    if (!storyboard) {
      refreshAll();
    }
  }, [storyboard, refreshAll]);

  const clipLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const clip of clips) {
      map.set(clip.shot_id, clip.has_clip);
    }
    return map;
  }, [clips]);

  const scenes = useMemo(() => {
    if (!storyboard?.parts) return [];
    return storyboard.parts.flatMap((part) => part.scenes);
  }, [storyboard]);

  const totalDuration = useMemo(() => {
    return scenes.reduce(
      (sum, scene) => sum + scene.shots.reduce((s, shot) => s + shot.duration_sec, 0),
      0
    );
  }, [scenes]);

  const totalShots = useMemo(() => {
    return scenes.reduce((sum, scene) => sum + scene.shots.length, 0);
  }, [scenes]);

  const doneClips = useMemo(() => {
    return scenes.reduce(
      (sum, scene) =>
        sum + scene.shots.filter((shot) => clipLookup.get(shot.shot_id)).length,
      0
    );
  }, [scenes, clipLookup]);

  const sceneColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const scene of scenes) {
      if (!map.has(scene.scene_id)) {
        map.set(scene.scene_id, getSceneColor(scene.scene_id));
      }
    }
    return map;
  }, [scenes]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Compose</h1>
        <p className="mt-1 text-sm text-muted">Stitch clips into final film</p>
      </div>

      {/* Two-column: Settings + Title Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Settings Panel */}
        <div className="glass p-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <Sliders size={16} className="text-cyan" />
            <span className="text-sm font-semibold text-white section-heading">Render Settings</span>
          </div>

          {/* Preset Selector */}
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Preset
            </span>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`relative rounded-lg border p-3 text-left transition-all ${
                    preset === p.key
                      ? "border-cyan/50 bg-cyan/10"
                      : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                  }`}
                >
                  {preset === p.key && (
                    <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan" />
                  )}
                  <div className="text-sm font-medium text-white">{p.label}</div>
                  <div className="mt-1 text-[11px] leading-tight text-muted">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Crossfade Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Crossfade Duration
              </span>
              <span className="text-sm font-mono text-cyan">{crossfade.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={crossfade}
              onChange={(e) => setCrossfade(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-[10px] text-muted">
              <span>0.0s</span>
              <span>2.0s</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <ToggleRow
              label="Include Narration"
              active={includeNarration}
              onToggle={() => setIncludeNarration(!includeNarration)}
            />
            <ToggleRow
              label="Color Grading"
              active={colorGrading}
              onToggle={() => setColorGrading(!colorGrading)}
            />
          </div>

          {/* Compose Button */}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan to-cyan/80 px-4 py-3 text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-[0.98]">
            <Film size={16} />
            Compose Chapter 1
          </button>
        </div>

        {/* Title Card Preview */}
        <div className="glass overflow-hidden">
          <div
            className="flex flex-col items-center justify-center px-8 py-16"
            style={{
              background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-light) 100%)",
            }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-widest gradient-text text-glow-cyan">
                THE MOLE WORLD
              </h2>
              <p className="text-lg text-muted">Chapter 1 &mdash; The Beginning</p>
              <div
                className="mx-auto h-px w-48"
                style={{
                  background:
                    "linear-gradient(to right, transparent, var(--cyan), transparent)",
                }}
              />
              <p className="text-sm text-muted/70">A Film by Deep Chand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-cyan" />
          <span className="text-sm font-semibold text-white section-heading">Timeline</span>
          <span className="ml-auto text-xs text-muted">
            {totalShots} shots &middot; {formatDuration(totalDuration)}
          </span>
        </div>

        {scenes.length > 0 ? (
          <>
            {/* Scene strips */}
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-2" style={{ minWidth: "max-content" }}>
                {scenes.map((scene) => {
                  const color = sceneColorMap.get(scene.scene_id) ?? "#666";
                  return (
                    <div key={scene.scene_id} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-medium text-muted truncate max-w-[120px]">
                        {scene.scene_id}
                      </span>
                      <div className="flex gap-0.5">
                        {scene.shots.map((shot) => {
                          const hasVideo = clipLookup.get(shot.shot_id) ?? false;
                          const width = Math.max(shot.duration_sec * 12, 20);
                          return (
                            <div
                              key={shot.shot_id}
                              className="timeline-bar group relative"
                              style={{
                                width: `${width}px`,
                                backgroundColor: color,
                                opacity: hasVideo ? 1 : 0.25,
                              }}
                              title={shot.shot_id}
                            >
                              <div className="pointer-events-none absolute inset-x-0 -top-8 hidden items-center justify-center group-hover:flex">
                                <span className="rounded bg-black/90 px-2 py-0.5 text-[10px] text-white whitespace-nowrap border border-white/10">
                                  {shot.shot_id}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 border-t border-white/8 pt-3">
              {Array.from(sceneColorMap.entries()).map(([sceneId, color]) => (
                <div key={sceneId} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] text-muted">{sceneId}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted">
            Loading storyboard data...
          </div>
        )}
      </div>

      {/* Readiness Checklist + Output Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Readiness Checklist */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-cyan" />
            <span className="text-sm font-semibold text-white section-heading">Composition Readiness</span>
          </div>
          <div className="space-y-2.5 stagger-list">
            {(() => {
              const readinessPct = totalShots > 0 ? Math.round((doneClips / totalShots) * 100) : 0;
              const checks = [
                { label: "Video clips rendered", ok: doneClips > 0, detail: `${doneClips}/${totalShots}` },
                { label: "Storyboard loaded", ok: scenes.length > 0, detail: `${scenes.length} scenes` },
                { label: "Render preset selected", ok: true, detail: preset },
                { label: "Crossfade configured", ok: crossfade > 0, detail: `${crossfade.toFixed(1)}s` },
                { label: "All clips ready", ok: readinessPct === 100, detail: `${readinessPct}%` },
              ];
              return checks.map((check) => (
                <div key={check.label} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5 row-hover">
                  {check.ok ? (
                    <CheckCircle size={14} className="text-success shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-warning shrink-0" />
                  )}
                  <span className="text-xs text-white flex-1">{check.label}</span>
                  <span className={`text-[10px] font-mono ${check.ok ? "text-success" : "text-warning"}`}>
                    {check.detail}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Output Summary */}
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileVideo size={16} className="text-cyan" />
            <span className="text-sm font-semibold text-white section-heading">Output Summary</span>
          </div>
          <div className="flex items-center gap-6 mb-4">
            {/* Mini progress ring */}
            <div className="relative shrink-0">
              {(() => {
                const pct = totalShots > 0 ? Math.round((doneClips / totalShots) * 100) : 0;
                const r = 32;
                const circ = 2 * Math.PI * r;
                const offset = circ - (pct / 100) * circ;
                return (
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle
                      cx="40" cy="40" r={r} fill="none"
                      stroke="#00d4ff"
                      strokeWidth="4"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s ease" }}
                    />
                    <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fill="#00d4ff" fontSize="16" fontWeight="bold">
                      {pct}%
                    </text>
                  </svg>
                );
              })()}
            </div>
            <div className="space-y-2 flex-1">
              <SummaryItem
                icon={<Monitor size={14} className="text-cyan" />}
                label="Output"
                value="chapter1_composed.mp4"
              />
              <SummaryItem
                icon={<Clock size={14} className="text-cyan" />}
                label="Duration"
                value={formatDuration(totalDuration)}
              />
              <SummaryItem
                icon={<Sparkles size={14} className="text-cyan" />}
                label="Clips"
                value={`${doneClips} / ${totalShots}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <button
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          active ? "bg-cyan" : "bg-white/15"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      </div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
