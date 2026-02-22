"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Mic, Volume2, CheckCircle2, XCircle, User,
  Search, AudioWaveform, Play, Pause, Filter,
  Globe, Sparkles, AlertCircle, ThumbsUp, ThumbsDown,
  Download, RefreshCw, FileAudio,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { SkeletonStatRow, SkeletonGrid, SkeletonLine, SkeletonBlock } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────
interface VoiceEntry {
  key: string;
  name: string;
  category: string;
  language: string;
  accent: string | null;
  engine: string;
  referenceClip: string;
  referenceSource: string;
  sampleText: string;
  quality: string;
  tags: string[];
  hasReference?: boolean;
  downloadMeta?: { source: string; downloadedAt: string };
}

interface VoiceLibrary {
  version: string;
  defaultVoice: string;
  voices: VoiceEntry[];
}

type CategoryKey = "all" | "western_male" | "western_female" | "east_asian_male" | "east_asian_female" | "south_asian_male" | "south_asian_female" | "movie_character";
type QualityFilter = "all" | "pending" | "good" | "replace" | "has_clip" | "no_clip";
type GenderFilter = "all" | "male" | "female";
type RegionFilter = "all" | "western" | "east_asian" | "south_asian";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Voices",
  western_male: "Western Male",
  western_female: "Western Female",
  east_asian_male: "East Asian Male",
  east_asian_female: "East Asian Female",
  south_asian_male: "South Asian Male",
  south_asian_female: "South Asian Female",
  movie_character: "Movie Characters",
};

const CATEGORY_COLORS: Record<string, string> = {
  western_male: "#3b82f6",
  western_female: "#ec4899",
  east_asian_male: "#f59e0b",
  east_asian_female: "#a855f7",
  south_asian_male: "#22c55e",
  south_asian_female: "#06b6d4",
  movie_character: "#ef4444",
};

const QUALITY_COLORS: Record<string, string> = {
  pending: "#6b7280",
  good: "#22c55e",
  replace: "#ef4444",
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "EN", hi: "HI", zh: "ZH", ja: "JA", ko: "KO", ta: "TA", ur: "UR",
};

// ── Waveform ──────────────────────────────────────────────────
function WaveformBar({ color, playing }: { color: string; playing: boolean }) {
  const bars = 20;
  return (
    <div className="flex items-end gap-[2px] h-6">
      {Array.from({ length: bars }, (_, i) => {
        const baseHeight = 20 + Math.sin(i * 0.8) * 30 + Math.cos(i * 1.2) * 20;
        return (
          <div
            key={i}
            className={`w-[2px] rounded-full ${playing ? "waveform-active" : ""}`}
            style={{
              height: `${baseHeight}%`,
              background: color,
              opacity: playing ? 0.8 : 0.3,
              animationDuration: ["0.4s", "0.5s", "0.6s", "0.7s"][i % 4],
              animationDelay: `${i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function VoicesPage() {
  const [library, setLibrary] = useState<VoiceLibrary | null>(null);
  const [category, setCategory] = useState<CategoryKey>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  const [updatingQuality, setUpdatingQuality] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchVoices = useCallback(() => {
    fetch("/api/voices", { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((data) => setLibrary(data as VoiceLibrary))
      .catch(() => {});
  }, []);

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    fetchVoices();
    const interval = setInterval(fetchVoices, 15_000);
    return () => clearInterval(interval);
  }, [fetchVoices]);

  const voices = library?.voices ?? [];

  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      if (category !== "all" && v.category !== category) return false;
      // Gender filter: movie_character passes through
      if (genderFilter !== "all" && v.category !== "movie_character") {
        if (genderFilter === "male" && !v.category.includes("_male")) return false;
        if (genderFilter === "female" && !v.category.includes("_female")) return false;
      }
      // Region filter: movie_character passes through
      if (regionFilter !== "all" && v.category !== "movie_character") {
        if (regionFilter === "western" && !v.category.startsWith("western")) return false;
        if (regionFilter === "east_asian" && !v.category.startsWith("east_asian")) return false;
        if (regionFilter === "south_asian" && !v.category.startsWith("south_asian")) return false;
      }
      if (languageFilter !== "all" && v.language !== languageFilter) return false;
      if (qualityFilter === "has_clip" && !v.hasReference) return false;
      if (qualityFilter === "no_clip" && v.hasReference) return false;
      if (qualityFilter === "good" && v.quality !== "good") return false;
      if (qualityFilter === "pending" && v.quality !== "pending") return false;
      if (qualityFilter === "replace" && v.quality !== "replace") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return v.name.toLowerCase().includes(q) || v.key.includes(q) || v.tags.some((t) => t.includes(q));
      }
      return true;
    });
  }, [voices, category, genderFilter, regionFilter, languageFilter, qualityFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: voices.length };
    for (const v of voices) {
      counts[v.category] = (counts[v.category] ?? 0) + 1;
    }
    return counts;
  }, [voices]);

  const languages = useMemo(() => {
    const set = new Set(voices.map((v) => v.language));
    return ["all", ...Array.from(set).sort()];
  }, [voices]);

  const togglePlayback = useCallback((voiceKey: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingVoice === voiceKey) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingVoice(null);
      return;
    }

    audio.src = `/api/media/voice_profiles/${voiceKey}/reference.wav`;
    audio.play().catch(() => {});
    setPlayingVoice(voiceKey);
  }, [playingVoice]);

  const handleTestVoice = useCallback(async (voice: VoiceEntry) => {
    setTestingVoice(voice.key);
    try {
      const res = await fetch("/api/voices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voice.sampleText, voiceKey: voice.key }),
      });
      const data = await res.json() as { audioUrl?: string; error?: string };
      if (data.audioUrl && audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.play().catch(() => {});
        setPlayingVoice(voice.key);
      }
    } catch { /* ignore */ }
    setTestingVoice(null);
  }, []);

  const handleSetQuality = useCallback(async (voiceKey: string, quality: string) => {
    setUpdatingQuality(voiceKey);
    try {
      await fetch("/api/voices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: voiceKey, quality }),
      });
      // Update local state immediately
      setLibrary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          voices: prev.voices.map((v) =>
            v.key === voiceKey ? { ...v, quality } : v
          ),
        };
      });
    } catch { /* ignore */ }
    setUpdatingQuality(null);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPlayingVoice(null);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  if (!library) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="skeleton w-5 h-5 rounded" />
              <SkeletonLine className="w-28 h-5" />
            </div>
            <SkeletonLine className="w-52 h-3" />
          </div>
          <SkeletonBlock className="w-20 h-8" />
        </div>
        {/* Stats row */}
        <SkeletonStatRow count={4} />
        {/* Progress bar */}
        <div className="glass p-3 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLine className="w-36 h-3" />
            <SkeletonLine className="w-12 h-3" />
          </div>
          <SkeletonBlock className="h-2 w-full" />
        </div>
        {/* Category tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonBlock key={i} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
        {/* Voice grid */}
        <SkeletonGrid count={8} cols={4} />
      </div>
    );
  }

  const clipCount = voices.filter((v) => v.hasReference).length;
  const qualityCounts = {
    pending: voices.filter((v) => v.quality === "pending").length,
    good: voices.filter((v) => v.quality === "good").length,
    replace: voices.filter((v) => v.quality === "replace").length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <audio ref={audioRef} className="sr-only" preload="none" />

      {/* Header */}
      <PageHeader
        icon={AudioWaveform}
        iconBg="bg-cyan/10"
        title="Voice Library"
        subtitle={`${voices.length} voices \u00b7 ${clipCount} clips ready \u00b7 Default: ${library.defaultVoice}`}
        actions={
          <button
            onClick={fetchVoices}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-muted hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.10]"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        }
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Total Voices", value: voices.length, color: "var(--cyan)", icon: AudioWaveform },
          { label: "Clips Ready", value: clipCount, color: "var(--lime)", icon: FileAudio },
          { label: "Approved", value: qualityCounts.good, color: "var(--success)", icon: ThumbsUp },
          { label: "Needs Replace", value: qualityCounts.replace, color: "#ef4444", icon: ThumbsDown },
        ].map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
          />
        ))}
      </div>

      {/* Progress bar — clips downloaded */}
      <div className="glass p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted">Reference Clips Progress</span>
          <span className="text-xs font-mono text-white">{clipCount}/{voices.length}</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(clipCount / Math.max(voices.length, 1)) * 100}%`,
              background: "linear-gradient(90deg, var(--lime), var(--success))",
            }}
          />
        </div>
      </div>

      {/* Gender & Region Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <User size={12} className="text-muted" />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-muted" />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value as RegionFilter)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Regions</option>
            <option value="western">Western</option>
            <option value="east_asian">East Asian</option>
            <option value="south_asian">South Asian</option>
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <FilterTabs
        tabs={(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((cat) => ({
          key: cat,
          label: CATEGORY_LABELS[cat],
          count: categoryCounts[cat] ?? 0,
        }))}
        active={category}
        onChange={(key) => setCategory(key as CategoryKey)}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-muted" />
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === "all" ? "All Languages" : LANGUAGE_FLAGS[lang] ?? lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-muted" />
          <select
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Status</option>
            <option value="has_clip">Has Clip</option>
            <option value="no_clip">No Clip</option>
            <option value="pending">Pending Review</option>
            <option value="good">Approved</option>
            <option value="replace">Needs Replace</option>
          </select>
        </div>
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voices, tags..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-52"
          />
        </div>
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredVoices.map((voice) => {
          const color = CATEGORY_COLORS[voice.category] ?? "#94a3b8";
          const isPlaying = playingVoice === voice.key;
          const isTesting = testingVoice === voice.key;
          const isDefault = voice.key === library.defaultVoice;
          const hasClip = voice.hasReference;

          return (
            <div
              key={voice.key}
              className={`rounded-xl bg-white/[0.03] border p-4 hover:bg-white/[0.05] transition-all hover-lift ${
                isDefault ? "border-cyan/30" : "border-white/[0.10] hover:border-white/[0.1]"
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => hasClip && togglePlayback(voice.key)}
                  disabled={!hasClip}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all ${hasClip ? "hover:scale-105" : "opacity-30 cursor-not-allowed"}`}
                  style={{ background: `${color}15` }}
                  title={hasClip ? "Play reference clip" : "No reference clip yet"}
                >
                  {isPlaying ? (
                    <Pause size={14} style={{ color }} />
                  ) : hasClip ? (
                    <Play size={12} className="ml-0.5" style={{ color }} />
                  ) : (
                    <Download size={12} style={{ color }} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">{voice.name}</p>
                    {isDefault && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan/20 text-cyan font-bold shrink-0">DEFAULT</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted truncate">
                    {CATEGORY_LABELS[voice.category]?.replace(/^(Western|East Asian|South Asian|Movie)\s*/, "") ?? voice.category}
                    {voice.accent && ` · ${voice.accent}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {/* Clip status indicator */}
                  {hasClip ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-lime/15 text-lime font-mono flex items-center gap-0.5">
                      <FileAudio size={8} /> clip
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-muted font-mono">
                      no clip
                    </span>
                  )}
                  <span className="text-[9px] text-muted font-mono">
                    {LANGUAGE_FLAGS[voice.language] ?? voice.language}
                  </span>
                </div>
              </div>

              {/* Waveform */}
              <div className="mb-3 rounded-lg bg-black/20 px-2 py-1.5">
                <WaveformBar color={color} playing={isPlaying} />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {voice.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-muted">
                    {tag}
                  </span>
                ))}
                {voice.tags.length > 4 && (
                  <span className="text-[9px] text-muted">+{voice.tags.length - 4}</span>
                )}
              </div>

              {/* Quality review + actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-muted font-mono">
                    {voice.engine}
                  </span>
                  {/* Quality badge */}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{
                    background: `${QUALITY_COLORS[voice.quality] ?? "#6b7280"}20`,
                    color: QUALITY_COLORS[voice.quality] ?? "#6b7280",
                  }}>
                    {voice.quality}
                  </span>
                </div>

                {/* Review buttons — only show when clip exists */}
                {hasClip ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSetQuality(voice.key, "good")}
                      disabled={updatingQuality === voice.key || voice.quality === "good"}
                      className={`p-1 rounded-md transition-colors ${
                        voice.quality === "good"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/[0.04] text-muted hover:bg-green-500/15 hover:text-green-400"
                      }`}
                      title="Mark as good"
                    >
                      <ThumbsUp size={11} />
                    </button>
                    <button
                      onClick={() => handleSetQuality(voice.key, "replace")}
                      disabled={updatingQuality === voice.key || voice.quality === "replace"}
                      className={`p-1 rounded-md transition-colors ${
                        voice.quality === "replace"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-white/[0.04] text-muted hover:bg-red-500/15 hover:text-red-400"
                      }`}
                      title="Mark for replacement"
                    >
                      <ThumbsDown size={11} />
                    </button>
                    <button
                      onClick={() => togglePlayback(voice.key)}
                      className="p-1 rounded-md bg-cyan/10 text-cyan hover:bg-cyan/20 transition-colors"
                      title="Play reference"
                    >
                      {isPlaying ? <Pause size={11} /> : <Volume2 size={11} />}
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-muted italic">downloading...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredVoices.length === 0 && (
        <div className="py-12 text-center text-sm text-muted">
          No voices match the current filters
        </div>
      )}
    </div>
  );
}
