"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import {
  Mic, Volume2, CheckCircle2, XCircle, User,
} from "lucide-react";

export default function VoicesPage() {
  const { voices, refreshAll } = useDashboardStore();

  useEffect(() => {
    if (!voices) refreshAll();
  }, [voices, refreshAll]);

  const profiles = voices?.profiles ?? [];
  const assignments = voices?.assignments ?? [];
  const withAudio = assignments.filter((a) => a.has_audio).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Voice Lab</h1>
        <p className="text-sm text-muted mt-1">
          {assignments.length} assignments &middot; {withAudio} generated &middot; {profiles.length} voice profiles
        </p>
      </div>

      {/* Narrator info */}
      {voices?.narrator_voice && (
        <div className="glass glow-cyan p-4 flex items-center gap-3">
          <Volume2 size={16} className="text-cyan" />
          <span className="text-sm text-white">Primary Narrator:</span>
          <code className="text-sm font-mono text-cyan">{voices.narrator_voice}</code>
        </div>
      )}

      {/* Voice Profiles */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Voice Profiles</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div key={profile.key} className="rounded-lg bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${profile.color}20` }}
                >
                  <User size={14} style={{ color: profile.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{profile.name}</p>
                  <p className="text-[10px] text-muted">{profile.label}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{profile.shot_count} shots</span>
                <span className="flex items-center gap-1">
                  {profile.has_reference ? (
                    <><CheckCircle2 size={10} className="text-success" /> Reference</>
                  ) : (
                    <><XCircle size={10} className="text-muted" /> No ref</>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Voice Assignments</h3>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {assignments.map((a) => {
            const profile = profiles.find((p) => p.key === a.voice_actor);
            return (
              <div key={a.shot_id} className="flex items-center gap-4 rounded-lg bg-white/[0.02] px-4 py-2.5 hover:bg-white/[0.04] transition-colors">
                <code className="w-24 text-xs font-mono text-cyan">{a.shot_id}</code>
                <span className="w-16 text-xs text-muted">{a.scene_id}</span>
                <div className="flex items-center gap-2 flex-1">
                  {profile && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ background: profile.color }} />
                      <span className="text-xs text-white">{profile.name}</span>
                    </div>
                  )}
                </div>
                {a.characters.length > 0 && (
                  <span className="text-[10px] text-muted">{a.characters.join(", ")}</span>
                )}
                {a.has_audio ? (
                  <CheckCircle2 size={12} className="text-success" />
                ) : (
                  <XCircle size={12} className="text-white/10" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
