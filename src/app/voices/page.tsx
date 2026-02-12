"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/lib/store";
import { getSceneColor } from "@/lib/utils";
import {
  Mic, Volume2, CheckCircle2, XCircle, User,
  Search, AudioWaveform, Play, Pause,
} from "lucide-react";
import { VoicesSkeleton } from "@/components/ui/skeleton";

function WaveformBar({ color, playing }: { color: string; playing: boolean }) {
  const bars = 24;
  const durations = ["0.4s", "0.5s", "0.6s", "0.7s"];
  return (
    <div className="flex items-end gap-[2px] h-8">
      {Array.from({ length: bars }, (_, i) => {
        const baseHeight = 20 + Math.sin(i * 0.8) * 30 + Math.cos(i * 1.2) * 20;
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full ${playing ? "waveform-active" : ""}`}
            style={{
              height: `${baseHeight}%`,
              background: color,
              opacity: playing ? 0.8 : 0.3,
              animationDuration: durations[i % 4],
              animationDelay: `${i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

type VoiceFilter = "all" | "has_audio" | "missing";

export default function VoicesPage() {
  const { voices, refreshAll } = useDashboardStore();
  const [filter, setFilter] = useState<VoiceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingProfile, setPlayingProfile] = useState<string | null>(null);

  useEffect(() => {
    if (!voices) refreshAll();
  }, [voices, refreshAll]);

  const profiles = voices?.profiles ?? [];
  const assignments = voices?.assignments ?? [];
  const withAudio = assignments.filter((a) => a.has_audio).length;
  const audioPct = assignments.length > 0 ? Math.round((withAudio / assignments.length) * 100) : 0;

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (searchQuery && !a.shot_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !a.voice_actor.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filter === "has_audio") return a.has_audio;
      if (filter === "missing") return !a.has_audio;
      return true;
    });
  }, [assignments, filter, searchQuery]);

  const sceneStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const a of assignments) {
      const s = map.get(a.scene_id) ?? { total: 0, done: 0 };
      s.total++;
      if (a.has_audio) s.done++;
      map.set(a.scene_id, s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [assignments]);

  if (!voices) return <VoicesSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AudioWaveform size={20} className="text-cyan" />
            Voice Lab
          </h1>
          <p className="text-sm text-muted mt-1">
            {assignments.length} assignments &middot; {profiles.length} voice profiles
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="glass glow-cyan p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
              <Mic size={20} className="text-cyan" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Audio Generation Progress</p>
              <p className="text-xs text-muted">{withAudio} of {assignments.length} narrations generated</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan number-pop">{audioPct}%</p>
          </div>
        </div>
        <div className="progress-bar h-2">
          <div className="progress-fill" style={{ width: `${audioPct}%`, background: "#00d4ff" }} />
        </div>
      </div>

      {/* Narrator info */}
      {voices?.narrator_voice && (
        <div className="glass p-4 flex items-center gap-3">
          <Volume2 size={16} className="text-cyan" />
          <span className="text-sm text-white">Primary Narrator:</span>
          <code className="text-sm font-mono text-cyan bg-cyan/[0.08] px-2 py-0.5 rounded">{voices.narrator_voice}</code>
        </div>
      )}

      {/* Voice Profiles */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={14} className="text-amber" />
          <h3 className="text-sm font-semibold text-white section-heading">Voice Profiles</h3>
          <span className="text-[10px] text-muted">{profiles.length} profiles</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const shotsDone = assignments.filter((a) => a.voice_actor === profile.key && a.has_audio).length;
            const pct = profile.shot_count > 0 ? Math.round((shotsDone / profile.shot_count) * 100) : 0;
            const isPlaying = playingProfile === profile.key;
            return (
              <div key={profile.key} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all hover-lift">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setPlayingProfile(isPlaying ? null : profile.key)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105"
                    style={{ background: `${profile.color}15` }}
                  >
                    {isPlaying ? (
                      <Pause size={16} style={{ color: profile.color }} />
                    ) : (
                      <Play size={14} className="ml-0.5" style={{ color: profile.color }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                    <p className="text-[10px] text-muted">{profile.label}</p>
                  </div>
                  {profile.has_reference ? (
                    <span className="flex items-center gap-1 text-[10px] text-success">
                      <CheckCircle2 size={10} /> Ref
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <XCircle size={10} /> No ref
                    </span>
                  )}
                </div>
                {/* Waveform visualization */}
                <div className="mb-3 rounded-lg bg-black/20 px-3 py-2">
                  <WaveformBar color={profile.color} playing={isPlaying} />
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted">{shotsDone}/{profile.shot_count} shots</span>
                    <span style={{ color: profile.color }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: profile.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene Audio Coverage */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mic size={14} className="text-success" />
          <h3 className="text-sm font-semibold text-white section-heading">Scene Audio Coverage</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {sceneStats.map(([sceneId, { total, done }]) => {
            const pct = Math.round((done / total) * 100);
            const color = getSceneColor(sceneId);
            const r = 14;
            const circ = 2 * Math.PI * r;
            const offset = circ - (pct / 100) * circ;
            return (
              <div key={sceneId} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/[0.02] transition-colors hover-lift cursor-pointer">
                <div className="relative">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                    <circle
                      cx="20" cy="20" r={r} fill="none"
                      stroke={color} strokeWidth="2.5"
                      strokeDasharray={circ} strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{done}/{total}</span>
                  </div>
                </div>
                <span className="text-[9px] text-muted font-mono">{sceneId.replace("P1_", "")}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignments Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5">
          {(["all", "has_audio", "missing"] as VoiceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f ? "filter-active" : "text-muted hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f === "has_audio" ? "Generated" : "Missing"}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shots..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-44"
          />
        </div>
      </div>

      {/* Assignments Table */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mic size={14} className="text-cyan" />
          <h3 className="text-sm font-semibold text-white section-heading">Voice Assignments</h3>
          <span className="text-[10px] text-muted ml-auto">{filteredAssignments.length} shown</span>
        </div>
        <div className="space-y-1 max-h-[500px] overflow-y-auto stagger-list">
          {filteredAssignments.map((a) => {
            const profile = profiles.find((p) => p.key === a.voice_actor);
            const sceneColor = getSceneColor(a.scene_id);
            return (
              <div key={a.shot_id} className="flex items-center gap-4 rounded-xl bg-white/[0.02] px-4 py-2.5 hover:bg-white/[0.04] transition-all row-hover">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: sceneColor }} />
                <code className="w-24 text-xs font-mono text-cyan shrink-0">{a.shot_id}</code>
                <span className="w-16 text-xs text-muted shrink-0">{a.scene_id}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {profile && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: profile.color }} />
                      <span className="text-xs text-white truncate">{profile.name}</span>
                    </div>
                  )}
                </div>
                {a.characters.length > 0 && (
                  <span className="text-[10px] text-muted truncate max-w-[120px] hidden sm:block">{a.characters.join(", ")}</span>
                )}
                {a.has_audio ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-end gap-[1px] h-3">
                      {Array.from({ length: 5 }, (_, j) => (
                        <div
                          key={j}
                          className="w-[2px] rounded-full bg-success/50"
                          style={{ height: `${30 + Math.sin(j * 1.5) * 40 + 30}%` }}
                        />
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-success font-semibold">
                      <CheckCircle2 size={12} /> Done
                    </span>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-white/20">
                    <XCircle size={12} /> Pending
                  </span>
                )}
              </div>
            );
          })}
          {filteredAssignments.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">No assignments match the current filter</div>
          )}
        </div>
      </div>
    </div>
  );
}
