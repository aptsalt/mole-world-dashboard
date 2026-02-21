"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Monitor,
  Zap,
  Newspaper,
  Play,
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
} from "lucide-react";
import { clsx } from "clsx";
import {
  getOrchestrateStatus,
  getOrchestrateModels,
  getOrchestrateJobs,
  createOrchestrateJob,
  updateOrchestrateJob,
  getPromptPresets,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────

type Pipeline = "higgsfield" | "content" | "local_gpu";
type ContentType = "image" | "clip" | "lesson" | "chat";
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
  chat: MessageSquare,
};

// ── Page ────────────────────────────────────────────────────────

export default function OrchestratePage() {
  // Pipeline status
  const [pipelines, setPipelines] = useState<Record<Pipeline, PipelineInfo>>({
    local_gpu: { status: "idle", label: "Local GPU", activeJobs: 0 },
    higgsfield: { status: "idle", label: "Higgsfield", activeJobs: 0 },
    content: { status: "idle", label: "Content", activeJobs: 0 },
  });

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

  const promptRef = useRef<HTMLTextAreaElement>(null);

  // ── Data fetching ──────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const [statusData, modelsData, jobsData, presetsData] = await Promise.all([
      getOrchestrateStatus(),
      getOrchestrateModels(),
      getOrchestrateJobs({ limit: 50 }),
      getPromptPresets(),
    ]);

    if (statusData.pipelines) {
      // Only take the 3 pipelines we care about
      const { local_gpu, higgsfield, content } = statusData.pipelines;
      setPipelines((prev) => ({
        local_gpu: local_gpu ?? prev.local_gpu,
        higgsfield: higgsfield ?? prev.higgsfield,
        content: content ?? prev.content,
      }));
    }
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

  // ── Handlers ───────────────────────────────────────────────

  const handleSubmit = async (priority: number = 0, scheduled: boolean = false) => {
    if (!prompt.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await createOrchestrateJob({
        type: contentType,
        description: prompt.trim(),
        pipeline: selectedPipeline,
        priority,
        scheduledAt: scheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        narrationMode,
        narrationScript: narrationMode === "manual" ? narrationScript : undefined,
        voiceKey: ["clip", "lesson"].includes(contentType) ? voiceKey : undefined,
        imageModelAlias: imageModel,
        videoModelAlias: ["clip", "lesson"].includes(contentType) ? videoModel : undefined,
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0d0d1a] via-[#111126] to-[#0d0d1a]">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime/20 to-cyan/20">
              <Clapperboard size={20} className="text-lime" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Orchestrate</h1>
              <p className="text-xs text-zinc-500">Production Command Center</p>
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
        <div className="mb-6 grid grid-cols-3 gap-3">
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
                  <span className="text-xs font-medium text-zinc-400">{config.label}</span>
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

        {/* Two-column layout: Presets Left, Composer + Queue Right */}
        <div className="flex gap-6">
          {/* ── Left Column: Prompt Library ──────────────────── */}
          <div className="w-[340px] shrink-0">
            <div className="sticky top-0 rounded-xl border border-white/[0.08] bg-bg-light/80">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] p-4">
                <Quote size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">Prompt Library</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                  {presets.length}
                </span>
              </div>

              {/* Search */}
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <Search size={12} className="text-zinc-600" />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search presets..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder-zinc-600"
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
                      : "bg-white/5 text-zinc-500 hover:bg-white/10"
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
                        : "bg-white/5 text-zinc-500 hover:bg-white/10"
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
                      <span className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-zinc-600">
                        {preset.prompt.slice(0, 80)}...
                      </span>
                    </button>
                  ))}
                  {filteredPresets.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-xs text-zinc-600">
                      No presets found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Composer + Queue Summary ───────── */}
          <div className="min-w-0 flex-1">
            {/* Composer */}
            <div className="mb-6 rounded-xl border border-white/[0.08] bg-bg-light/80 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-lime" />
                <span className="text-sm font-semibold text-white">Composer</span>
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
                          : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
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
                  {(["image", "clip", "lesson", "chat"] as ContentType[]).map((t) => {
                    const Icon = CONTENT_TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setContentType(t)}
                        className={clsx(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition",
                          contentType === t
                            ? "bg-lime/15 text-lime ring-1 ring-lime/30"
                            : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
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
                  <p className="mt-1 text-xs text-zinc-500">Local Stable Diffusion, ComfyUI, and LLM inference</p>
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
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-lime/40 focus:ring-1 focus:ring-lime/20"
                      rows={3}
                    />
                  </div>

                  {/* Model / Voice / Narration row */}
                  {selectedPipeline === "higgsfield" && (
                    <div className="mb-4 flex flex-wrap gap-3">
                      {/* Image model */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Image Model</label>
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
                      {["clip", "lesson"].includes(contentType) && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Video Model</label>
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
                      {["clip", "lesson"].includes(contentType) && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Voice</label>
                          <div className="flex items-center gap-2">
                            <Mic size={12} className="text-zinc-500" />
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
                      {["clip", "lesson"].includes(contentType) && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Narration</label>
                          <div className="flex gap-1">
                            {(["auto", "manual"] as NarrationMode[]).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setNarrationMode(mode)}
                                className={clsx(
                                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition",
                                  narrationMode === mode
                                    ? "bg-cyan/15 text-cyan ring-1 ring-cyan/30"
                                    : "bg-white/5 text-zinc-500 hover:bg-white/10"
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

                  {/* Manual narration script */}
                  {narrationMode === "manual" && ["clip", "lesson"].includes(contentType) && selectedPipeline === "higgsfield" && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Narration Script</label>
                        <span className="text-[10px] text-zinc-600">
                          {wordCount} words / ~{estimatedDuration}s
                        </span>
                      </div>
                      <textarea
                        value={narrationScript}
                        onChange={(e) => setNarrationScript(e.target.value)}
                        placeholder="Write your narration script here..."
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-cyan/40"
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

                    <span className="ml-auto text-[10px] text-zinc-600">Ctrl+Enter to submit</span>
                  </div>
                </>
              )}
            </div>

            {/* Queue Summary — slim, max 5 jobs */}
            <div className="rounded-xl border border-white/[0.08] bg-bg-light/80 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan" />
                  <span className="text-sm font-semibold text-white">Queue Summary</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
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
                  <div className="py-6 text-center text-xs text-zinc-600">
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
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-400">
                        {job.type}
                      </span>

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

                      {/* Time */}
                      <span className="shrink-0 text-[9px] text-zinc-600">
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
