"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Monitor,
  Zap,
  Newspaper,
  Play,
  Pause,
  Clock,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Film,
  Image as ImageIcon,
  BookOpen,
  MessageSquare,
  Mic,
  Sparkles,
  Quote,
  Clapperboard,
  Send,
  ArrowRight,
  Music,
  CloudDownload,
  Volume2,
  Archive,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import {
  getOrchestrateStatus,
  getOrchestrateModels,
  getOrchestrateJobs,
  createOrchestrateJob,
  updateOrchestrateJob,
  getPromptPresets,
  getBgmPresets,
  downloadBgmTrack,
  getJobHistory,
} from "@/lib/api";
import type { BgmTrack, ArchivedJob } from "@/lib/api";
import { TemplateGallery } from "@/components/orchestrate/template-gallery";

// ── Types ──────────────────────────────────────────────────────

type Pipeline = "higgsfield" | "content" | "local_gpu";
type ContentType = "image" | "clip" | "lesson" | "film" | "chat";
type NarrationMode = "auto" | "manual";

interface PipelineInfo {
  status: "idle" | "active" | "offline" | "error";
  label: string;
  activeJobs: number;
}

interface Model {
  alias: string;
  name: string;
  description: string;
}

interface OrchestrateJob {
  id: string;
  type: string;
  description: string;
  status: string;
  pipeline: string;
  source: string;
  priority: number;
  scheduledAt: string | null;
  voiceKey: string | null;
  imageModelAlias: string | null;
  videoModelAlias: string | null;
  narrationMode: string;
  outputPaths: string[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cast?: Array<{ character: string; voice: string }> | null;
  sceneCount?: number | null;
  currentScene?: number | null;
  totalScenes?: number | null;
}

interface CastRow {
  character: string;
  voice: string;
}

interface Preset {
  id: string;
  name: string;
  category: string;
  prompt: string;
  tags: string[];
}

// ── Pipeline config (no distribution) ─────────────────────────

const PIPELINE_CONFIG: Record<Pipeline, { icon: typeof Monitor; color: string; bgColor: string; label: string }> = {
  local_gpu: { icon: Monitor, color: "text-blue-400", bgColor: "bg-blue-500/15", label: "Local GPU" },
  higgsfield: { icon: Zap, color: "text-lime", bgColor: "bg-lime/15", label: "Higgsfield" },
  content: { icon: Newspaper, color: "text-orange-400", bgColor: "bg-orange-500/15", label: "Content" },
};

const STATUS_COLORS: Record<string, string> = {
  idle: "text-zinc-400",
  active: "text-green-400",
  offline: "text-red-400",
  error: "text-red-400",
};

const STATUS_DOT: Record<string, string> = {
  idle: "bg-zinc-500",
  active: "bg-green-400 animate-pulse",
  offline: "bg-red-500",
  error: "bg-red-500 animate-pulse",
};

const JOB_STATUS_CONFIG: Record<string, { color: string; icon: typeof Loader2; label: string }> = {
  pending: { color: "text-amber-400", icon: Clock, label: "Pending" },
  building_prompt: { color: "text-lime", icon: Sparkles, label: "Enhancing" },
  building_content: { color: "text-lime", icon: Sparkles, label: "Building" },
  generating_image: { color: "text-lime", icon: Loader2, label: "Generating" },
  generating_video: { color: "text-lime", icon: Loader2, label: "Video Gen" },
  delivering: { color: "text-cyan", icon: Send, label: "Delivering" },
  completed: { color: "text-green-400", icon: CheckCircle2, label: "Done" },
  failed: { color: "text-red-400", icon: XCircle, label: "Failed" },
};

const CONTENT_TYPE_ICONS: Record<ContentType, typeof ImageIcon> = {
  image: ImageIcon,
  clip: Film,
  lesson: BookOpen,
  film: Clapperboard,
  chat: MessageSquare,
};

const SCENE_COUNT_OPTIONS = [3, 5, 7, 10, 15, 20];

const FILM_TEMPLATE_OPTIONS = [
  { key: "", label: "No Template" },
  { key: "documentary", label: "Documentary \u2014 Observe, Explore, Reveal" },
  { key: "drama", label: "Drama \u2014 Setup, Conflict, Resolution" },
  { key: "explainer", label: "Explainer \u2014 Question, Breakdown, Insight" },
  { key: "travel_vlog", label: "Travel Vlog \u2014 Arrive, Explore, Reflect" },
  { key: "product_launch", label: "Product Launch \u2014 Tease, Reveal, Impact" },
];

// ── Page ────────────────────────────────────────────────────────

export default function OrchestratePage() {
  // Pipeline status
  const [pipelines, setPipelines] = useState<Record<Pipeline, PipelineInfo>>({
    local_gpu: { status: "idle", label: "Local GPU", activeJobs: 0 },
    higgsfield: { status: "idle", label: "Higgsfield", activeJobs: 0 },
    content: { status: "idle", label: "Content", activeJobs: 0 },
  });

  // Services
  const [services, setServices] = useState<{
    worker: boolean;
    bridge: boolean;
    ollama: boolean;
    xApi: boolean;
    perplexity: boolean;
  }>({ worker: false, bridge: false, ollama: false, xApi: false, perplexity: false });

  // Models
  const [imageModels, setImageModels] = useState<Model[]>([]);
  const [videoModels, setVideoModels] = useState<Model[]>([]);

  // Jobs
  const [jobs, setJobs] = useState<OrchestrateJob[]>([]);

  // Presets
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetCategories, setPresetCategories] = useState<string[]>([]);
  const [activePresetCategory, setActivePresetCategory] = useState<string>("all");
  const [presetSearch, setPresetSearch] = useState("");

  // Composer state
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline>("higgsfield");
  const [contentType, setContentType] = useState<ContentType>("clip");
  const [prompt, setPrompt] = useState("");
  const [imageModel, setImageModel] = useState("a");
  const [videoModel, setVideoModel] = useState("a");
  const [voiceKey, setVoiceKey] = useState("morgan_freeman");
  const [narrationMode, setNarrationMode] = useState<NarrationMode>("auto");
  const [narrationScript, setNarrationScript] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cast state (multi-voice)
  const [castEnabled, setCastEnabled] = useState(false);
  const [castRows, setCastRows] = useState<CastRow[]>([
    { character: "narrator", voice: "morgan_freeman" },
    { character: "character", voice: "james_earl_jones" },
  ]);

  // Film scene count
  const [sceneCount, setSceneCount] = useState(5);

  // Film template
  const [filmTemplate, setFilmTemplate] = useState<string>("");

  // BGM state
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>([]);
  const [selectedBgm, setSelectedBgm] = useState<string | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.15);
  const [bgmExpanded, setBgmExpanded] = useState(false);
  const [bgmDownloading, setBgmDownloading] = useState<string | null>(null);
  const [bgmPlaying, setBgmPlaying] = useState<string | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);

  const promptRef = useRef<HTMLTextAreaElement>(null);

  // History state
  const [historyJobs, setHistoryJobs] = useState<ArchivedJob[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // ── Data fetching ──────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const [statusData, modelsData, jobsData, presetsData, bgmData] = await Promise.all([
      getOrchestrateStatus(),
      getOrchestrateModels(),
      getOrchestrateJobs({ limit: 50 }),
      getPromptPresets(),
      getBgmPresets(),
    ]);
    if (bgmData.tracks) setBgmTracks(bgmData.tracks);

    if (statusData.pipelines) {
      // Only take the 3 pipelines we care about
      const { local_gpu, higgsfield, content } = statusData.pipelines;
      setPipelines((prev) => ({
        local_gpu: local_gpu ?? prev.local_gpu,
        higgsfield: higgsfield ?? prev.higgsfield,
        content: content ?? prev.content,
      }));
    }
    if (statusData.services) setServices(statusData.services);
    if (modelsData.image) setImageModels(modelsData.image);
    if (modelsData.video) setVideoModels(modelsData.video);
    if (Array.isArray(jobsData)) setJobs(jobsData);
    if (presetsData.presets) setPresets(presetsData.presets);
    if (presetsData.categories) setPresetCategories(presetsData.categories);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── History fetching ────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    try {
      const params: { search?: string; type?: string; limit?: number } = { limit: 20 };
      if (historySearch) params.search = historySearch;
      if (historyType) params.type = historyType;
      const data = await getJobHistory(params);
      setHistoryJobs(data.jobs ?? []);
      setHistoryTotal(data.total ?? 0);
    } catch { /* ignore */ }
  }, [historySearch, historyType]);

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory, fetchHistory]);

  // ── Handlers ───────────────────────────────────────────────

  const handleSubmit = async (priority: number = 0, scheduled: boolean = false) => {
    if (!prompt.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const hasVoice = ["clip", "lesson", "film"].includes(contentType);
      const hasCast = castEnabled && castRows.length > 1 && hasVoice;

      await createOrchestrateJob({
        type: contentType,
        description: prompt.trim(),
        pipeline: selectedPipeline,
        priority,
        scheduledAt: scheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        narrationMode,
        narrationScript: narrationMode === "manual" ? narrationScript : undefined,
        voiceKey: hasVoice && !hasCast ? voiceKey : undefined,
        imageModelAlias: imageModel,
        videoModelAlias: hasVoice ? videoModel : undefined,
        bgmPresetKey: selectedBgm && hasVoice ? selectedBgm : undefined,
        bgmVolume: selectedBgm && hasVoice ? bgmVolume : undefined,
        cast: hasCast ? castRows.filter((c) => c.character && c.voice) : undefined,
        sceneCount: contentType === "film" ? sceneCount : undefined,
        ...(filmTemplate ? { filmTemplateKey: filmTemplate } : {}),
      });

      setPrompt("");
      setNarrationScript("");
      setScheduledAt("");
      fetchAll();
    } catch (err) {
      console.error("Failed to create job:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobAction = async (jobId: string, action: "cancel" | "retry") => {
    try {
      if (action === "cancel") await updateOrchestrateJob(jobId, { status: "failed" });
      if (action === "retry") await updateOrchestrateJob(jobId, { status: "pending" });
      fetchAll();
    } catch (err) {
      console.error("Job action failed:", err);
    }
  };

  const injectPreset = (presetPrompt: string) => {
    setPrompt((prev) => prev ? `${prev}, ${presetPrompt}` : presetPrompt);
    promptRef.current?.focus();
  };

  // Template system — populate form from a saved template
  const handleUseTemplate = useCallback((template: {
    type?: string;
    prompt?: string;
    pipeline?: string;
    voiceKey?: string;
    imageModelAlias?: string;
    videoModelAlias?: string;
    narrationMode?: string;
    bgmPresetKey?: string;
    bgmVolume?: number;
  }) => {
    if (template.type) setContentType(template.type as ContentType);
    if (template.prompt) setPrompt(template.prompt);
    if (template.pipeline) setSelectedPipeline(template.pipeline as Pipeline);
    if (template.voiceKey) setVoiceKey(template.voiceKey);
    if (template.imageModelAlias) setImageModel(template.imageModelAlias);
    if (template.videoModelAlias) setVideoModel(template.videoModelAlias);
    if (template.narrationMode) setNarrationMode(template.narrationMode as NarrationMode);
    if (template.bgmPresetKey) setSelectedBgm(template.bgmPresetKey);
    if (template.bgmVolume != null) setBgmVolume(template.bgmVolume);
  }, []);

  const currentTemplateValues = {
    type: contentType,
    pipeline: selectedPipeline,
    prompt,
    imageModelAlias: imageModel,
    videoModelAlias: videoModel,
    voiceKey,
    narrationMode,
    bgmPresetKey: selectedBgm ?? undefined,
    bgmVolume,
  };

  // Sync BGM preview volume when slider changes
  useEffect(() => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = Math.min(bgmVolume * 3, 1.0);
    }
  }, [bgmVolume]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(0, false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Filtered data ──────────────────────────────────────────

  const filteredPresets = presets.filter((p) => {
    if (activePresetCategory !== "all" && p.category !== activePresetCategory) return false;
    if (presetSearch && !p.name.toLowerCase().includes(presetSearch.toLowerCase()) && !p.prompt.toLowerCase().includes(presetSearch.toLowerCase())) return false;
    return true;
  });

  // Queue summary: top 5 most relevant jobs (active first, then pending, then recent completed)
  const activeJobs = jobs.filter((j) => !["pending", "completed", "failed"].includes(j.status));
  const pendingJobs = jobs.filter((j) => j.status === "pending");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");
  const topJobs = [...activeJobs, ...pendingJobs, ...completedJobs, ...failedJobs].slice(0, 5);

  const wordCount = narrationScript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.round(wordCount / 2.5);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime/20 to-cyan/20">
              <Clapperboard size={20} className="text-lime" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">Orchestrate</h1>
              <p className="text-xs text-muted">Production Command Center</p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Pipeline Status Bar — 3 cards */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(Object.entries(PIPELINE_CONFIG) as [Pipeline, typeof PIPELINE_CONFIG[Pipeline]][]).map(([key, config]) => {
            const info = pipelines[key];
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="group relative flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bgColor)}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-medium text-muted">{config.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={clsx("h-1.5 w-1.5 rounded-full", STATUS_DOT[info.status])} />
                    <span className={clsx("text-xs font-semibold capitalize", STATUS_COLORS[info.status])}>
                      {info.status}
                    </span>
                    {info.activeJobs > 0 && (
                      <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {info.activeJobs}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Service Status */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: "Worker", ok: services.worker },
            { label: "Bridge", ok: services.bridge },
            { label: "Ollama", ok: services.ollama },
            { label: "X API", ok: services.xApi },
            { label: "Perplexity", ok: services.perplexity },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1">
              <span className={clsx("h-1.5 w-1.5 rounded-full", s.ok ? "bg-green-400" : "bg-zinc-600")} />
              <span className="text-[10px] text-zinc-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Two-column layout: Presets Left, Composer + Queue Right */}
        <div className="flex gap-6">
          {/* ── Left Column: Prompt Library + Templates ──────── */}
          <div className="w-[340px] shrink-0 space-y-4">
            <div className="sticky top-0 rounded-xl border border-white/[0.08] bg-bg-light/80">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] p-4">
                <Quote size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-text">Prompt Library</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                  {presets.length}
                </span>
              </div>

              {/* Search */}
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <Search size={12} className="text-muted" />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search presets..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-muted"
                  />
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-4 py-3">
                <button
                  onClick={() => setActivePresetCategory("all")}
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-[10px] font-medium transition",
                    activePresetCategory === "all"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/5 text-muted hover:bg-white/10"
                  )}
                >
                  All
                </button>
                {presetCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActivePresetCategory(cat)}
                    className={clsx(
                      "rounded-md px-2.5 py-1 text-[10px] font-medium transition",
                      activePresetCategory === cat
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-white/5 text-muted hover:bg-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Preset grid — scrollable */}
              <div className="max-h-[calc(100vh-380px)] overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => injectPreset(preset.prompt)}
                      className="group flex flex-col items-start rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5"
                      title={preset.prompt}
                    >
                      <span className="text-[10px] font-semibold text-zinc-300 group-hover:text-amber-300">
                        {preset.name}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted">
                        {preset.prompt.slice(0, 80)}...
                      </span>
                    </button>
                  ))}
                  {filteredPresets.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-xs text-muted">
                      No presets found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template Gallery */}
            <TemplateGallery
              onUseTemplate={handleUseTemplate}
              currentValues={currentTemplateValues}
            />
          </div>

          {/* ── Right Column: Composer + Queue Summary ───────── */}
          <div className="min-w-0 flex-1">
            {/* Composer */}
            <div className="mb-6 rounded-xl border border-white/[0.08] bg-bg-light/80 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-lime" />
                <span className="text-sm font-semibold text-text">Composer</span>
              </div>

              {/* Pipeline selector (3 pipelines, no distribution) */}
              <div className="mb-4 flex gap-2">
                {(Object.entries(PIPELINE_CONFIG) as [Pipeline, typeof PIPELINE_CONFIG[Pipeline]][]).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPipeline(key)}
                      className={clsx(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                        selectedPipeline === key
                          ? `${config.bgColor} ${config.color} ring-1 ring-white/20`
                          : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-300"
                      )}
                    >
                      <Icon size={12} /> {config.label}
                    </button>
                  );
                })}
              </div>

              {/* Content type (Higgsfield pipeline) */}
              {selectedPipeline === "higgsfield" && (
                <div className="mb-4 flex gap-2">
                  {(["image", "clip", "lesson", "film", "chat"] as ContentType[]).map((t) => {
                    const Icon = CONTENT_TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setContentType(t)}
                        className={clsx(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition",
                          contentType === t
                            ? "bg-lime/15 text-lime ring-1 ring-lime/30"
                            : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-300"
                        )}
                      >
                        <Icon size={12} /> {t}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Local GPU placeholder */}
              {selectedPipeline === "local_gpu" && (
                <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-center">
                  <Monitor size={24} className="mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-medium text-blue-300">Coming Soon: RTX 4090M Pipeline</p>
                  <p className="mt-1 text-xs text-muted">Local Stable Diffusion, ComfyUI, and LLM inference</p>
                </div>
              )}

              {/* Prompt textarea */}
              {(selectedPipeline === "higgsfield" || selectedPipeline === "content") && (
                <>
                  <div className="mb-4">
                    <textarea
                      ref={promptRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={selectedPipeline === "content" ? "Enter topic or news story..." : "Describe what you want to create..."}
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-muted outline-none transition focus:border-lime/40 focus:ring-1 focus:ring-lime/20"
                      rows={3}
                    />
                  </div>

                  {/* Model / Voice / Narration row */}
                  {selectedPipeline === "higgsfield" && (
                    <div className="mb-4 flex flex-wrap gap-3">
                      {/* Image model */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Image Model</label>
                        <select
                          value={imageModel}
                          onChange={(e) => setImageModel(e.target.value)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 outline-none"
                        >
                          {imageModels.map((m) => (
                            <option key={m.alias} value={m.alias}>{m.alias.toUpperCase()}: {m.name}</option>
                          ))}
                          {imageModels.length === 0 && <option value="a">A: nano-banana-pro</option>}
                        </select>
                      </div>

                      {/* Video model (for clip/lesson) */}
                      {["clip", "lesson", "film"].includes(contentType) && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Video Model</label>
                          <select
                            value={videoModel}
                            onChange={(e) => setVideoModel(e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 outline-none"
                          >
                            {videoModels.map((m) => (
                              <option key={m.alias} value={m.alias}>{m.alias.toUpperCase()}: {m.name}</option>
                            ))}
                            {videoModels.length === 0 && <option value="a">A: kling-2.5-turbo</option>}
                          </select>
                        </div>
                      )}

                      {/* Voice (for clip/lesson) */}
                      {["clip", "lesson", "film"].includes(contentType) && !castEnabled && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Voice</label>
                          <div className="flex items-center gap-2">
                            <Mic size={12} className="text-muted" />
                            <input
                              type="text"
                              value={voiceKey}
                              onChange={(e) => setVoiceKey(e.target.value)}
                              className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 outline-none"
                              placeholder="morgan_freeman"
                            />
                          </div>
                        </div>
                      )}

                      {/* Narration mode (for clip/lesson) */}
                      {["clip", "lesson", "film"].includes(contentType) && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Narration</label>
                          <div className="flex gap-1">
                            {(["auto", "manual"] as NarrationMode[]).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setNarrationMode(mode)}
                                className={clsx(
                                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition",
                                  narrationMode === mode
                                    ? "bg-cyan/15 text-cyan ring-1 ring-cyan/30"
                                    : "bg-white/5 text-muted hover:bg-white/10"
                                )}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Film Template (film only) */}
                  {contentType === "film" && selectedPipeline === "higgsfield" && (
                    <div className="mb-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Film Template</label>
                        <select
                          value={filmTemplate}
                          onChange={(e) => {
                            setFilmTemplate(e.target.value);
                            if (e.target.value === "documentary") setSceneCount(7);
                            else if (e.target.value === "travel_vlog") setSceneCount(7);
                            else if (e.target.value) setSceneCount(5);
                          }}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        >
                          {FILM_TEMPLATE_OPTIONS.map((t) => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Scene Count (film only) */}
                  {contentType === "film" && selectedPipeline === "higgsfield" && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Scenes</label>
                        <select
                          value={sceneCount}
                          onChange={(e) => setSceneCount(parseInt(e.target.value, 10))}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 outline-none"
                        >
                          {SCENE_COUNT_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n} scenes (~{n * 0.5} min, ~{Math.round(n * 2.5)} min gen)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Cast Picker (multi-voice) — for clip/lesson/film */}
                  {["clip", "lesson", "film"].includes(contentType) && selectedPipeline === "higgsfield" && (
                    <div className="mb-4">
                      <button
                        onClick={() => setCastEnabled(!castEnabled)}
                        className={clsx(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                          castEnabled
                            ? "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        )}
                      >
                        <Mic size={12} />
                        {castEnabled ? `Cast: ${castRows.length} voices` : "Multi-Voice Cast"}
                      </button>

                      {castEnabled && (
                        <div className="mt-2 space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                          {castRows.map((row, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={row.character}
                                onChange={(e) => {
                                  const updated = [...castRows];
                                  updated[idx] = { ...updated[idx], character: e.target.value };
                                  setCastRows(updated);
                                }}
                                placeholder="Character name"
                                className="w-32 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 outline-none"
                              />
                              <input
                                type="text"
                                value={row.voice}
                                onChange={(e) => {
                                  const updated = [...castRows];
                                  updated[idx] = { ...updated[idx], voice: e.target.value };
                                  setCastRows(updated);
                                }}
                                placeholder="voice_key"
                                className="w-40 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 outline-none"
                              />
                              {castRows.length > 2 && (
                                <button
                                  onClick={() => setCastRows(castRows.filter((_, i) => i !== idx))}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <XCircle size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                          {castRows.length < 6 && (
                            <button
                              onClick={() => setCastRows([...castRows, { character: "", voice: "" }])}
                              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                            >
                              <Plus size={10} /> Add voice
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BGM Picker (for clip/lesson/film) */}
                  {["clip", "lesson", "film"].includes(contentType) && selectedPipeline === "higgsfield" && (
                    <div className="mb-4">
                      <button
                        onClick={() => setBgmExpanded(!bgmExpanded)}
                        className={clsx(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                          selectedBgm
                            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        )}
                      >
                        <Music size={12} />
                        {selectedBgm
                          ? `BGM: ${bgmTracks.find((t) => t.key === selectedBgm)?.name ?? selectedBgm}`
                          : "Add Background Music"
                        }
                        {selectedBgm && (
                          <span className="ml-1 text-[10px] opacity-60">vol {bgmVolume.toFixed(2)}</span>
                        )}
                        <span className="ml-auto text-[10px] opacity-50">{bgmExpanded ? "▲" : "▼"}</span>
                      </button>

                      {bgmExpanded && (
                        <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                          {/* No BGM + Volume */}
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => setSelectedBgm(null)}
                              className={clsx(
                                "rounded px-2 py-1 text-[10px] font-medium transition",
                                !selectedBgm
                                  ? "bg-white/10 text-white ring-1 ring-white/20"
                                  : "bg-white/5 text-muted hover:bg-white/10"
                              )}
                            >
                              None
                            </button>
                            {selectedBgm && (
                              <div className="flex items-center gap-2 flex-1">
                                <Volume2 size={10} className="text-muted" />
                                <input
                                  type="range"
                                  min={0} max={0.5} step={0.01}
                                  value={bgmVolume}
                                  onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                                  className="flex-1 accent-amber-500"
                                />
                                <span className="text-[10px] text-muted w-8">{bgmVolume.toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {/* Track grid */}
                          <div className="max-h-[180px] overflow-y-auto space-y-1 scrollbar-thin">
                            {bgmTracks.map((track) => (
                              <div
                                key={track.key}
                                onClick={() => { if (track.hasTrack) setSelectedBgm(track.key); }}
                                className={clsx(
                                  "flex items-center gap-2 rounded px-2 py-1.5 text-[11px] cursor-pointer transition",
                                  selectedBgm === track.key
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "text-zinc-400 hover:bg-white/5"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-zinc-300">{track.name}</span>
                                  <span className="ml-1.5 text-[10px] opacity-50">{track.category}</span>
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
                                    className="text-amber-400 hover:text-amber-300"
                                    title={bgmPlaying === track.key ? "Pause" : "Preview"}
                                  >
                                    {bgmPlaying === track.key ? <Pause size={10} /> : <Play size={10} />}
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBgmDownloading(track.key);
                                      downloadBgmTrack(track.key)
                                        .then(() => fetchAll())
                                        .catch(() => {})
                                        .finally(() => setBgmDownloading(null));
                                    }}
                                    disabled={bgmDownloading === track.key}
                                    className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                                    title="Download"
                                  >
                                    {bgmDownloading === track.key
                                      ? <Loader2 size={10} className="animate-spin" />
                                      : <CloudDownload size={10} />
                                    }
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <audio
                            ref={bgmAudioRef}
                            onEnded={() => setBgmPlaying(null)}
                            onPause={() => setBgmPlaying(null)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual narration script */}
                  {narrationMode === "manual" && ["clip", "lesson", "film"].includes(contentType) && selectedPipeline === "higgsfield" && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Narration Script</label>
                        <span className="text-[10px] text-muted">
                          {wordCount} words / ~{estimatedDuration}s
                        </span>
                      </div>
                      <textarea
                        value={narrationScript}
                        onChange={(e) => setNarrationScript(e.target.value)}
                        placeholder="Write your narration script here..."
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-muted outline-none transition focus:border-cyan/40"
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSubmit(0, false)}
                      disabled={!prompt.trim() || isSubmitting}
                      className="flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-xs font-bold text-black transition hover:bg-lime/80 disabled:opacity-40"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add to Queue
                    </button>

                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 outline-none"
                      />
                      <button
                        onClick={() => handleSubmit(0, true)}
                        disabled={!prompt.trim() || !scheduledAt || isSubmitting}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      >
                        <Clock size={12} /> Schedule
                      </button>
                    </div>

                    <button
                      onClick={() => handleSubmit(100, false)}
                      disabled={!prompt.trim() || isSubmitting}
                      className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 transition hover:bg-green-500/20 disabled:opacity-40"
                    >
                      <Play size={12} /> Run Now
                    </button>

                    <span className="ml-auto text-[10px] text-muted">Ctrl+Enter to submit</span>
                  </div>
                </>
              )}
            </div>

            {/* Queue Summary — slim, max 5 jobs */}
            <div className="rounded-xl border border-white/[0.08] bg-bg-light/80 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan" />
                  <span className="text-sm font-semibold text-text">Queue Summary</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    {activeJobs.length} active
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {pendingJobs.length} pending
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {completedJobs.length} done
                  </span>
                  {failedJobs.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      {failedJobs.length} failed
                    </span>
                  )}
                </div>
              </div>

              {/* Compact job rows */}
              <div className="flex flex-col gap-1.5">
                {topJobs.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted">
                    No jobs yet. Use the composer to create one.
                  </div>
                )}
                {topJobs.map((job) => {
                  const statusConfig = JOB_STATUS_CONFIG[job.status] ?? JOB_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  const pipelineConfig = PIPELINE_CONFIG[(job.pipeline ?? "higgsfield") as Pipeline] ?? PIPELINE_CONFIG.higgsfield;
                  const PipelineIcon = pipelineConfig.icon;
                  const isActive = !["completed", "failed", "pending"].includes(job.status);

                  return (
                    <div
                      key={job.id}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all",
                        isActive
                          ? "border-lime/20 bg-lime/[0.03]"
                          : "border-white/[0.04] bg-white/[0.01]"
                      )}
                    >
                      {/* Pipeline icon */}
                      <div className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", pipelineConfig.bgColor)}>
                        <PipelineIcon size={10} className={pipelineConfig.color} />
                      </div>

                      {/* Type badge */}
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                        {job.type}
                      </span>

                      {/* Scene progress for film jobs */}
                      {job.type === "film" && job.currentScene != null && job.totalScenes != null && (
                        <span className="shrink-0 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                          Scene {job.currentScene}/{job.totalScenes}
                        </span>
                      )}

                      {/* Narration mode badge (clip/lesson/film) */}
                      {["clip", "lesson", "film"].includes(job.type) && job.narrationMode && (
                        <span className={clsx(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          job.narrationMode === "auto"
                            ? "bg-cyan/10 text-cyan"
                            : "bg-purple-500/10 text-purple-400"
                        )}>
                          {job.narrationMode === "auto" ? "🎤 Auto" : "✏️ Manual"}
                        </span>
                      )}

                      {/* Description */}
                      <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">{job.description}</p>

                      {/* Status */}
                      <div className={clsx("flex shrink-0 items-center gap-1 text-[10px] font-medium", statusConfig.color)}>
                        <StatusIcon size={10} className={isActive ? "animate-spin" : ""} />
                        {statusConfig.label}
                      </div>

                      {/* Quick actions */}
                      {job.status === "pending" && (
                        <button
                          onClick={() => handleJobAction(job.id, "cancel")}
                          className="rounded p-0.5 text-zinc-600 transition hover:bg-red-500/20 hover:text-red-400"
                          title="Cancel"
                        >
                          <XCircle size={10} />
                        </button>
                      )}
                      {job.status === "failed" && (
                        <button
                          onClick={() => handleJobAction(job.id, "retry")}
                          className="rounded p-0.5 text-zinc-600 transition hover:bg-amber-500/20 hover:text-amber-400"
                          title="Retry"
                        >
                          <RefreshCw size={10} />
                        </button>
                      )}

                      {/* Open in Narration Studio link for completed clip/lesson jobs */}
                      {job.status === "completed" && ["clip", "lesson", "film"].includes(job.type) && (
                        <Link
                          href="/narration"
                          className="rounded p-0.5 text-zinc-600 transition hover:bg-purple-500/20 hover:text-purple-400"
                          title="Open in Narration Studio"
                        >
                          <Mic size={10} />
                        </Link>
                      )}

                      {/* Time */}
                      <span className="shrink-0 text-[10px] text-muted">
                        {formatTimeAgo(job.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* View Full Queue link */}
              {jobs.length > 0 && (
                <div className="mt-3 border-t border-white/[0.06] pt-3 text-center">
                  <Link
                    href="/queue"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan transition hover:text-cyan/80"
                  >
                    View Full Queue <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>

            {/* ── Job History / Archive ─────────────────────────── */}
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white"
              >
                <Archive size={14} />
                <span>Job History</span>
                <span className="ml-auto text-xs text-zinc-500">
                  {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search history..."
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-zinc-500"
                    />
                    <select
                      value={historyType}
                      onChange={(e) => setHistoryType(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">All Types</option>
                      <option value="image">Image</option>
                      <option value="clip">Clip</option>
                      <option value="lesson">Lesson</option>
                      <option value="film">Film</option>
                    </select>
                    <button onClick={fetchHistory} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
                      <Search size={12} />
                    </button>
                  </div>

                  <div className="text-[10px] text-zinc-500">{historyTotal} archived jobs</div>

                  <div className="max-h-60 space-y-1 overflow-y-auto">
                    {historyJobs.map((job) => (
                      <div key={job.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                        <span className={clsx(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          job.status === "completed" ? "bg-green-400" : "bg-red-400"
                        )} />
                        <span className="shrink-0 font-mono text-zinc-500">{job.type}</span>
                        <span className="flex-1 truncate text-zinc-300">{job.description}</span>
                        {job.error && (
                          <span className="shrink-0 truncate max-w-[120px] text-[10px] text-red-400" title={job.error}>
                            {job.error}
                          </span>
                        )}
                        <span className="shrink-0 text-zinc-600">{new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {historyJobs.length === 0 && (
                      <div className="py-4 text-center text-xs text-zinc-600">No archived jobs yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
