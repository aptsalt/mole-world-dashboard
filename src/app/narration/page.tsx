"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic2, RefreshCw, Play, Pause, Download, Send, Save,
  Sparkles, Volume2, Wand2, Film, Clock, Eye,
  FileAudio, AudioWaveform, AlertCircle, Check, Layers,
  Loader2, Music, CloudDownload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SkeletonLine, SkeletonCircle, SkeletonBlock } from "@/components/ui/skeleton";
import {
  getNarrationJobs,
  generateNarrationScript,
  generateNarrationTts,
  composeNarratedVideo,
  saveNarrationScript,
  updateNarrationMode,
  getBgmPresets,
  downloadBgmTrack,
} from "@/lib/api";
import type { BgmTrack } from "@/lib/api";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { VideoPreview } from "@/components/ui/video-preview";

// ── Types ──────────────────────────────────────────────────────

interface NarrationJob {
  id: string;
  type: string;
  description: string;
  status: string;
  voiceKey: string | null;
  narrationMode: string;
  narrationScript: string | null;
  narrationStatus: string;
  narrationAudioPath: string | null;
  narratedVideoPath: string | null;
  audioSettings: { narrationVolume: number; fadeIn: number; fadeOut: number } | null;
  outputPaths: string[];
  shotPlans: { shotNumber: number; imagePrompt: string; motionPrompt: string }[] | null;
  silentVideoPath: string | null;
  silentVideoUrl: string | null;
  silentVideoExists: boolean;
  narrationAudioUrl: string | null;
  narrationAudioExists: boolean;
  narratedVideoUrl: string | null;
  narratedVideoExists: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VoiceEntry {
  key: string;
  name: string;
  category: string;
  language: string;
}

type FilterMode = "all" | "ready" | "in_progress" | "composed";

// ── Helpers ────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusDot(narrationStatus: string): string {
  switch (narrationStatus) {
    case "none": return "#6b7280";
    case "script_ready": return "var(--warning)";
    case "generating_tts": return "var(--lime)";
    case "tts_ready": return "#3b82f6";
    case "composing": return "var(--lime)";
    case "composed": return "var(--success)";
    default: return "#6b7280";
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case "none": return "Ready";
    case "script_ready": return "Script Ready";
    case "generating_tts": return "Generating TTS";
    case "tts_ready": return "TTS Ready";
    case "composing": return "Composing";
    case "composed": return "Composed";
    default: return s;
  }
}

// ── Waveform ───────────────────────────────────────────────────

function WaveformBars({ playing, color }: { playing: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-6">
      {Array.from({ length: 24 }, (_, i) => {
        const baseHeight = 20 + Math.sin(i * 0.8) * 30 + Math.cos(i * 1.2) * 20;
        return (
          <div
            key={i}
            className={`w-[2px] rounded-full ${playing ? "waveform-active" : ""}`}
            style={{
              height: `${baseHeight}%`,
              backgroundColor: color,
              opacity: playing ? 0.9 : 0.3,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function NarrationStudioPage() {
  // Jobs
  const [jobs, setJobs] = useState<NarrationJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);

  // Editor state
  const [script, setScript] = useState("");
  const [voiceKey, setVoiceKey] = useState("morgan_freeman");
  const [voices, setVoices] = useState<VoiceEntry[]>([]);
  const [ttsEngine, setTtsEngine] = useState<"f5tts" | "bark-openvoice">("f5tts");
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [fadeIn, setFadeIn] = useState(0.5);
  const [fadeOut, setFadeOut] = useState(1.0);

  // Script tracking
  const [scriptDirty, setScriptDirty] = useState(false);
  const [isSavingScript, setIsSavingScript] = useState(false);

  // Progress
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [ttsElapsed, setTtsElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [narratedUrl, setNarratedUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSyncPlaying, setIsSyncPlaying] = useState(false);

  // Mode toggle + batch
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // BGM state
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>([]);
  const [selectedBgm, setSelectedBgm] = useState<string | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.15);
  const [bgmCategory, setBgmCategory] = useState<string>("All");
  const [bgmDownloading, setBgmDownloading] = useState<string | null>(null);
  const [bgmPlaying, setBgmPlaying] = useState<string | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const syncVideoRef = useRef<HTMLVideoElement>(null);
  const syncAudioRef = useRef<HTMLAudioElement>(null);
  const ttsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;

  // ── Data Loading ──────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getNarrationJobs();
      setJobs(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const fetchVoices = useCallback(async () => {
    try {
      const res = await fetch("/api/voices", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchBgm = useCallback(async () => {
    try {
      const data = await getBgmPresets();
      setBgmTracks(data.tracks ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchVoices();
    fetchBgm();
    const interval = setInterval(fetchJobs, 15_000);
    return () => clearInterval(interval);
  }, [fetchJobs, fetchVoices, fetchBgm]);

  // Sync editor when selection changes
  useEffect(() => {
    if (!selectedJob) return;
    setScript(selectedJob.narrationScript ?? "");
    setScriptDirty(false);
    setVoiceKey(selectedJob.voiceKey ?? "morgan_freeman");
    setAudioUrl(selectedJob.narrationAudioUrl);
    setNarratedUrl(selectedJob.narratedVideoUrl);
    if (selectedJob.audioSettings) {
      setNarrationVolume(selectedJob.audioSettings.narrationVolume);
      setFadeIn(selectedJob.audioSettings.fadeIn);
      setFadeOut(selectedJob.audioSettings.fadeOut);
    } else {
      setNarrationVolume(1.0);
      setFadeIn(0.5);
      setFadeOut(1.0);
    }
    setError(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered Jobs ──────────────────────────────────────────────

  const filteredJobs = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "ready") return j.narrationStatus === "none" || j.narrationStatus === "script_ready";
    if (filter === "in_progress") return ["generating_tts", "tts_ready", "composing"].includes(j.narrationStatus);
    if (filter === "composed") return j.narrationStatus === "composed";
    return true;
  });

  // Stats
  const readyCount = jobs.filter((j) => j.narrationStatus === "none" || j.narrationStatus === "script_ready").length;
  const progressCount = jobs.filter((j) => ["generating_tts", "tts_ready", "composing"].includes(j.narrationStatus)).length;
  const composedCount = jobs.filter((j) => j.narrationStatus === "composed").length;

  // ── Actions ────────────────────────────────────────────────────

  const handleGenerateScript = async () => {
    if (!selectedJob) return;
    setIsGeneratingScript(true);
    setError(null);
    try {
      const result = await generateNarrationScript(selectedJob.id, selectedJob.description, 30);
      setScript(result.script);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Script generation failed");
    }
    setIsGeneratingScript(false);
  };

  const handleSaveScript = async () => {
    if (!selectedJob || !script.trim()) return;
    setIsSavingScript(true);
    setError(null);
    try {
      await saveNarrationScript(selectedJob.id, script);
      setScriptDirty(false);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save script");
    }
    setIsSavingScript(false);
  };

  const handleGenerateTts = async () => {
    if (!selectedJob || !script.trim()) return;
    setIsGeneratingTts(true);
    setTtsElapsed(0);
    setError(null);

    // Start elapsed timer
    ttsTimerRef.current = setInterval(() => {
      setTtsElapsed((prev) => prev + 1);
    }, 1000);

    try {
      const result = await generateNarrationTts(selectedJob.id, script, voiceKey, ttsEngine);
      setAudioUrl(result.audioUrl);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "TTS generation failed");
    }

    if (ttsTimerRef.current) clearInterval(ttsTimerRef.current);
    ttsTimerRef.current = null;
    setIsGeneratingTts(false);
  };

  const handleCompose = async () => {
    if (!selectedJob) return;
    setIsComposing(true);
    setError(null);
    try {
      const bgm = selectedBgm ? { trackKey: selectedBgm, volume: bgmVolume } : null;
      const result = await composeNarratedVideo(selectedJob.id, {
        narrationVolume,
        fadeIn,
        fadeOut,
      }, bgm);
      setNarratedUrl(result.videoUrl);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compose failed");
    }
    setIsComposing(false);
  };

  const handleDownloadBgm = async (key: string) => {
    setBgmDownloading(key);
    try {
      await downloadBgmTrack(key);
      await fetchBgm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "BGM download failed");
    }
    setBgmDownloading(null);
  };

  const handlePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSyncPreview = () => {
    if (!syncVideoRef.current || !syncAudioRef.current) return;
    if (isSyncPlaying) {
      syncVideoRef.current.pause();
      syncAudioRef.current.pause();
      setIsSyncPlaying(false);
    } else {
      syncVideoRef.current.currentTime = 0;
      syncAudioRef.current.currentTime = 0;
      syncVideoRef.current.play();
      syncAudioRef.current.play();
      setIsSyncPlaying(true);
    }
  };

  const handleRedeliver = async () => {
    if (!selectedJob || !narratedUrl) return;
    setError(null);
    try {
      const res = await fetch("/api/narration/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.id, redeliver: true }),
      });
      if (!res.ok) throw new Error("Redeliver failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redeliver failed");
    }
  };

  const handleSwitchMode = async (newMode: "auto" | "manual") => {
    if (!selectedJob) return;
    setIsSwitchingMode(true);
    setError(null);
    try {
      await updateNarrationMode(
        selectedJob.id,
        newMode,
        newMode === "manual" ? script : undefined,
      );
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch mode");
    }
    setIsSwitchingMode(false);
  };

  const toggleBatchItem = (id: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchGenerate = async () => {
    if (batchSelected.size === 0) return;
    setIsBatchRunning(true);
    setError(null);
    const ids = Array.from(batchSelected);
    for (const id of ids) {
      const job = jobs.find((j) => j.id === id);
      if (!job) continue;
      try {
        // Generate script if none exists
        if (!job.narrationScript?.trim()) {
          await generateNarrationScript(job.id, job.description, 30);
        }
        // Fetch updated job to get script
        const updatedJobs = await getNarrationJobs();
        const updatedJob = updatedJobs.find((j: NarrationJob) => j.id === id);
        if (updatedJob?.narrationScript?.trim()) {
          await generateNarrationTts(updatedJob.id, updatedJob.narrationScript, updatedJob.voiceKey ?? "morgan_freeman");
        }
        setJobs(updatedJobs);
      } catch {
        // Continue with next job on error
      }
    }
    setBatchSelected(new Set());
    setIsBatchRunning(false);
    await fetchJobs();
  };

  // Sync BGM preview volume when slider changes
  useEffect(() => {
    if (bgmAudioRef.current) {
      // Scale up for preview (no narration to compete with), clamp to 1.0
      bgmAudioRef.current.volume = Math.min(bgmVolume * 3, 1.0);
    }
  }, [bgmVolume]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (ttsTimerRef.current) clearInterval(ttsTimerRef.current);
    };
  }, []);

  // Word count + duration estimate
  const wordCount = script.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.round(wordCount / 2.5);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <PageHeader
        icon={Mic2}
        iconBg="bg-purple-500/10"
        iconColor="text-purple-400"
        title="Narration Studio"
        subtitle="Post-video narration pipeline"
        actions={
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-muted hover:bg-white/[0.1] hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Ready", value: readyCount, color: "var(--warning)", icon: Clock },
          { label: "In Progress", value: progressCount, color: "var(--lime)", icon: Loader2 },
          { label: "Composed", value: composedCount, color: "var(--success)", icon: Check },
        ].map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Main Content: Job List + Editor */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left Panel: Job List */}
        <div className="flex w-[340px] shrink-0 flex-col rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {/* Filter Tabs */}
          <div className="border-b border-white/[0.08] p-2">
            <FilterTabs
              tabs={[
                { key: "all", label: "All" },
                { key: "ready", label: "Ready" },
                { key: "in_progress", label: "Active" },
                { key: "composed", label: "Done" },
              ]}
              active={filter}
              onChange={(key) => setFilter(key as FilterMode)}
            />
          </div>

          {/* Batch Actions */}
          {batchSelected.size > 0 && (
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2">
              <span className="text-[10px] text-muted">{batchSelected.size} selected</span>
              <button
                onClick={handleBatchGenerate}
                disabled={isBatchRunning}
                className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
              >
                {isBatchRunning ? (
                  <><RefreshCw size={10} className="animate-spin" /> Running...</>
                ) : (
                  <><Layers size={10} /> Batch Generate</>
                )}
              </button>
              <button
                onClick={() => setBatchSelected(new Set())}
                className="text-[10px] text-muted hover:text-white transition-colors ml-auto"
              >
                Clear
              </button>
            </div>
          )}

          {/* Job Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="space-y-2 animate-fade-in">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.02] border border-transparent p-3 space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center gap-2">
                      <SkeletonBlock className="w-14 h-5 rounded" />
                      <div className="flex-1" />
                      <SkeletonCircle size={8} />
                    </div>
                    <SkeletonLine className="w-full h-3" />
                    <SkeletonLine className="w-3/4 h-3" />
                    <div className="flex items-center gap-2">
                      <SkeletonCircle size={10} />
                      <SkeletonLine className="w-12 h-2" />
                      <div className="flex-1" />
                      <SkeletonLine className="w-16 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted text-xs">
                <Film size={24} className="mb-2 opacity-30" />
                <p>No narration jobs</p>
                <p className="mt-1 text-[10px]">Complete a lesson or clip to get started</p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isReady = job.narrationStatus === "none" || job.narrationStatus === "script_ready";
                return (
                <div
                  key={job.id}
                  className={`flex items-start gap-2 w-full rounded-lg p-3 text-left transition-all ${
                    selectedId === job.id
                      ? "bg-purple-500/10 border border-purple-500/30"
                      : "bg-white/[0.02] border border-transparent hover:bg-white/[0.05]"
                  }`}
                >
                  {isReady && (
                    <input
                      type="checkbox"
                      checked={batchSelected.has(job.id)}
                      onChange={(e) => { e.stopPropagation(); toggleBatchItem(job.id); }}
                      className="mt-1 shrink-0 accent-purple-500"
                    />
                  )}
                <button
                  onClick={() => setSelectedId(job.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        backgroundColor: job.type === "lesson" ? "rgba(168,85,247,0.15)" : "rgba(59,130,246,0.15)",
                        color: job.type === "lesson" ? "#a855f7" : "#3b82f6",
                      }}
                    >
                      {job.type}
                    </span>
                    {job.narrationMode && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        job.narrationMode === "auto"
                          ? "bg-cyan/10 text-cyan"
                          : "bg-purple-500/10 text-purple-400"
                      }`}>
                        {job.narrationMode === "auto" ? "Auto" : "Manual"}
                      </span>
                    )}
                    <span className="flex-1" />
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusDot(job.narrationStatus) }}
                      title={statusLabel(job.narrationStatus)}
                    />
                  </div>
                  <p className="text-xs text-white/80 line-clamp-2">{job.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted">
                    <Clock size={10} />
                    <span>{timeAgo(job.updatedAt)}</span>
                    <span className="ml-auto">{statusLabel(job.narrationStatus)}</span>
                  </div>
                </button>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-0">
          {!selectedJob ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div className="text-center text-muted">
                <Mic2 size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a job to start narrating</p>
              </div>
            </div>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-auto hover:text-white">x</button>
                </div>
              )}

              {/* Video Preview */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Film size={14} className="text-purple-400" />
                  <span className="text-sm font-medium text-text">Silent Video Preview</span>
                  {selectedJob.silentVideoExists && (
                    <span className="ml-auto text-[10px] text-muted">Silent source</span>
                  )}
                </div>
                {selectedJob.silentVideoUrl ? (
                  <VideoPreview
                    src={selectedJob.silentVideoUrl}
                    alt={`Silent video for ${selectedJob.id}`}
                    aspectRatio="video"
                    className="w-full max-h-[280px]"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[200px] rounded-lg bg-black/30 text-muted text-xs">
                    <span>No silent video found for this job</span>
                  </div>
                )}
              </div>

              {/* Narration Mode Toggle */}
              {(selectedJob.narrationStatus === "none" || selectedJob.narrationStatus === "script_ready") && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <Mic2 size={14} className="text-cyan" />
                    <span className="text-sm font-medium text-text">Narration Mode</span>
                    <div className="ml-auto flex gap-1">
                      {(["auto", "manual"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleSwitchMode(mode)}
                          disabled={isSwitchingMode}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                            (selectedJob.narrationMode ?? "auto") === mode
                              ? mode === "auto" ? "bg-cyan/15 text-cyan ring-1 ring-cyan/30" : "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30"
                              : "bg-white/5 text-muted hover:bg-white/10"
                          }`}
                        >
                          {mode === "auto" ? "🎤 Auto" : "✏️ Manual"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(selectedJob.narrationMode ?? "auto") === "auto" && (
                    <p className="mt-2 text-[10px] text-muted">Script will be auto-generated via Ollama after video is ready, then converted to TTS.</p>
                  )}
                </div>
              )}

              {/* Script Editor */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 size={14} className="text-amber-400" />
                  <span className="text-sm font-medium text-text">Narration Script</span>
                  {scriptDirty && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-400">
                      Unsaved
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted">
                    {wordCount} words ~ {estimatedDuration}s
                  </span>
                </div>

                {/* Shot plan info (if available) */}
                {selectedJob.shotPlans && selectedJob.shotPlans.length > 0 && (
                  <details className="mb-3">
                    <summary className="flex items-center gap-2 cursor-pointer text-[11px] text-muted hover:text-white/70 transition-colors">
                      <Eye size={11} />
                      <span>{selectedJob.shotPlans.length} shot plans available (click to expand)</span>
                    </summary>
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto rounded-lg bg-black/20 p-2">
                      {selectedJob.shotPlans.map((shot) => (
                        <div key={shot.shotNumber} className="text-[10px] text-white/60 border-l-2 border-purple-500/30 pl-2">
                          <span className="text-purple-400 font-medium">Shot {shot.shotNumber}:</span>{" "}
                          {shot.imagePrompt.slice(0, 120)}...
                          {shot.motionPrompt && (
                            <span className="text-blue-400/60 ml-1">[{shot.motionPrompt}]</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript}
                    className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                  >
                    {isGeneratingScript ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        {script.trim() ? "Re-Generate" : "Auto-Generate"}
                      </>
                    )}
                  </button>

                  {scriptDirty && (
                    <button
                      onClick={handleSaveScript}
                      disabled={isSavingScript || !script.trim()}
                      className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                    >
                      {isSavingScript ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={12} />
                          Save Script
                        </>
                      )}
                    </button>
                  )}
                </div>

                <textarea
                  value={script}
                  onChange={(e) => { setScript(e.target.value); setScriptDirty(true); }}
                  placeholder="Write your narration script here, or click Auto-Generate above..."
                  className="w-full h-32 rounded-lg bg-black/20 border border-white/[0.08] p-3 text-sm text-white/90 placeholder:text-muted resize-y focus:outline-none focus:border-purple-500/40"
                />
              </div>

              {/* Voice & Audio */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 size={14} className="text-blue-400" />
                  <span className="text-sm font-medium text-text">Voice & Audio</span>
                </div>

                {/* Engine Toggle */}
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs text-muted whitespace-nowrap">Engine:</label>
                  <div className="flex gap-1 flex-1">
                    {([
                      { key: "f5tts" as const, label: "F5-TTS", desc: "Voice Clone" },
                      { key: "bark-openvoice" as const, label: "Bark + OpenVoice", desc: "Expressive" },
                    ]).map((eng) => (
                      <button
                        key={eng.key}
                        onClick={() => setTtsEngine(eng.key)}
                        className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors ${
                          ttsEngine === eng.key
                            ? eng.key === "f5tts"
                              ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                              : "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                            : "bg-white/5 text-muted hover:bg-white/10"
                        }`}
                      >
                        <div>{eng.label}</div>
                        <div className="text-[10px] opacity-60">{eng.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Picker */}
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs text-muted whitespace-nowrap">Voice:</label>
                  <select
                    value={voiceKey}
                    onChange={(e) => setVoiceKey(e.target.value)}
                    className="flex-1 rounded-lg bg-black/20 border border-white/[0.08] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/40"
                  >
                    {voices.length > 0 ? (
                      voices.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.name} ({v.category})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="morgan_freeman">Morgan Freeman</option>
                        <option value="david_attenborough">David Attenborough</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Audio Controls */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Volume</label>
                    <input
                      type="range"
                      min={0} max={2} step={0.1}
                      value={narrationVolume}
                      onChange={(e) => setNarrationVolume(parseFloat(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <span className="text-[10px] text-muted">{narrationVolume.toFixed(1)}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Fade In (s)</label>
                    <input
                      type="number"
                      min={0} max={5} step={0.1}
                      value={fadeIn}
                      onChange={(e) => setFadeIn(parseFloat(e.target.value) || 0)}
                      className="w-full rounded bg-black/20 border border-white/[0.08] px-2 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Fade Out (s)</label>
                    <input
                      type="number"
                      min={0} max={5} step={0.1}
                      value={fadeOut}
                      onChange={(e) => setFadeOut(parseFloat(e.target.value) || 0)}
                      className="w-full rounded bg-black/20 border border-white/[0.08] px-2 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Generate TTS Button */}
                <button
                  onClick={handleGenerateTts}
                  disabled={isGeneratingTts || !script.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingTts ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Generating {ttsEngine === "f5tts" ? "F5-TTS" : "Bark+OpenVoice"}... ({ttsElapsed}s)
                    </>
                  ) : (
                    <>
                      <FileAudio size={12} />
                      Generate TTS ({ttsEngine === "f5tts" ? "F5-TTS" : "Bark+OV"})
                    </>
                  )}
                </button>

                {/* Audio Preview */}
                {audioUrl && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-black/20 p-3">
                    <button
                      onClick={handlePlayAudio}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div className="flex-1">
                      <WaveformBars playing={isPlayingAudio} color="#3b82f6" />
                    </div>
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlayingAudio(false)}
                      onPause={() => setIsPlayingAudio(false)}
                    />
                  </div>
                )}
              </div>

              {/* Background Music */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Music size={14} className="text-amber-400" />
                  <span className="text-sm font-medium text-text">Background Music</span>
                  {selectedBgm && (
                    <span className="ml-auto text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      {bgmTracks.find((t) => t.key === selectedBgm)?.name ?? selectedBgm}
                    </span>
                  )}
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {["All", ...new Set(bgmTracks.map((t) => t.category))].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBgmCategory(cat)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        bgmCategory === cat
                          ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                          : "bg-white/5 text-muted hover:bg-white/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* No BGM option */}
                <button
                  onClick={() => setSelectedBgm(null)}
                  className={`w-full mb-2 rounded-lg px-3 py-2 text-xs font-medium text-left transition-colors ${
                    !selectedBgm
                      ? "bg-white/10 text-white ring-1 ring-white/20"
                      : "bg-white/[0.03] text-muted hover:bg-white/[0.06]"
                  }`}
                >
                  No Background Music
                </button>

                {/* Track List */}
                <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
                  {bgmTracks
                    .filter((t) => bgmCategory === "All" || t.category === bgmCategory)
                    .map((track) => (
                      <div
                        key={track.key}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer ${
                          selectedBgm === track.key
                            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                            : "bg-white/[0.03] text-muted hover:bg-white/[0.06]"
                        }`}
                        onClick={() => {
                          if (track.hasTrack) setSelectedBgm(track.key);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white/90 truncate">{track.name}</div>
                          <div className="text-[10px] opacity-60">{track.category} · {track.mood.join(", ")}</div>
                        </div>

                        {track.hasTrack ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const audio = bgmAudioRef.current;
                              if (!audio) return;
                              if (bgmPlaying === track.key) {
                                audio.pause();
                                setBgmPlaying(null);
                              } else {
                                audio.src = `/api/media/bgm/${track.key}/track.mp3`;
                                audio.volume = Math.min(bgmVolume * 3, 1.0);
                                audio.play().catch(() => {});
                                setBgmPlaying(track.key);
                              }
                            }}
                            className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-amber-400"
                            title={bgmPlaying === track.key ? "Pause" : "Preview"}
                          >
                            {bgmPlaying === track.key ? <Pause size={10} /> : <Play size={10} />}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadBgm(track.key);
                            }}
                            disabled={bgmDownloading === track.key}
                            className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-blue-400 disabled:opacity-50"
                            title="Download"
                          >
                            {bgmDownloading === track.key ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <CloudDownload size={10} />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                </div>

                {/* Volume Control */}
                {selectedBgm && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-[10px] text-muted whitespace-nowrap">BGM Vol:</label>
                    <input
                      type="range"
                      min={0} max={0.5} step={0.01}
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-[10px] text-muted w-8 text-right">{bgmVolume.toFixed(2)}</span>
                  </div>
                )}

                <audio
                  ref={bgmAudioRef}
                  onEnded={() => setBgmPlaying(null)}
                  onPause={() => setBgmPlaying(null)}
                />
              </div>

              {/* Compose Section */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AudioWaveform size={14} className="text-green-400" />
                  <span className="text-sm font-medium text-text">Compose & Export</span>
                </div>

                {/* Sync Preview — inline video + synced audio */}
                {selectedJob.silentVideoUrl && audioUrl && (
                  <div className="mb-4">
                    <div className="rounded-lg overflow-hidden bg-black/30">
                      <video
                        ref={syncVideoRef}
                        src={selectedJob.silentVideoUrl}
                        muted
                        className="w-full max-h-[240px] rounded-lg bg-black"
                        onEnded={() => {
                          setIsSyncPlaying(false);
                          if (syncAudioRef.current) syncAudioRef.current.pause();
                        }}
                      />
                    </div>
                    <audio
                      ref={syncAudioRef}
                      src={audioUrl}
                      onEnded={() => setIsSyncPlaying(false)}
                    />
                    <button
                      onClick={handleSyncPreview}
                      className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-muted hover:bg-white/[0.1] hover:text-white transition-colors"
                    >
                      {isSyncPlaying ? <Pause size={12} /> : <Play size={12} />}
                      {isSyncPlaying ? "Pause Sync Preview" : "Play Sync Preview (Video + Audio)"}
                    </button>
                  </div>
                )}

                {/* Compose Button */}
                <button
                  onClick={handleCompose}
                  disabled={isComposing || !audioUrl}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500/10 px-4 py-2.5 text-xs font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  {isComposing ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Composing final video...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      Compose Final Video
                    </>
                  )}
                </button>

                {/* Composed Output */}
                {narratedUrl && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <Check size={14} />
                      <span>Narrated video ready!</span>
                    </div>
                    <video
                      src={narratedUrl}
                      controls
                      className="w-full rounded-lg bg-black max-h-[280px]"
                    />
                    <div className="flex gap-2">
                      <a
                        href={narratedUrl}
                        download
                        className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-muted hover:bg-white/[0.1] hover:text-white transition-colors"
                      >
                        <Download size={12} />
                        Download
                      </a>
                      {selectedJob.type === "lesson" && selectedJob.status === "completed" && (
                        <button
                          onClick={handleRedeliver}
                          className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                          <Send size={12} />
                          Re-deliver WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
