"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Film,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Mic,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

// ── Types ──────────────────────────────────────────────────────
interface WhatsAppJob {
  id: string;
  type: "image" | "clip" | "chat";
  description: string;
  enhancedPrompt: string | null;
  motionPrompt: string | null;
  replyTo: string;
  senderPhone: string;
  status: string;
  batchCount: number;
  outputPaths: string[];
  chatResponse: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ── Pipeline stages ────────────────────────────────────────────
const STAGES = [
  { key: "pending", label: "Received", icon: MessageSquare },
  { key: "building_prompt", label: "Enhancing", icon: Sparkles },
  { key: "generating_image", label: "Generating", icon: ImageIcon },
  { key: "delivering", label: "Delivering", icon: Send },
] as const;

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  building_prompt: 1,
  generating_image: 2,
  generating_video: 2,
  delivering: 3,
  completed: 4,
  failed: -1,
};

function getStageIndex(status: string): number {
  return STATUS_ORDER[status] ?? 0;
}

// ── Helpers ────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function duration(start: string, end: string | null): string {
  if (!end) return "...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

function mediaUrl(outputPath: string): string {
  const filename = outputPath.split("/").pop() ?? "";
  return `/api/whatsapp/media?file=${encodeURIComponent(filename)}`;
}

// ── Pipeline Dots Component ────────────────────────────────────
function PipelineDots({ status }: { status: string }) {
  const currentStage = getStageIndex(status);
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const isPast = isCompleted || currentStage > i;
        const isCurrent = !isFailed && !isCompleted && currentStage === i;

        return (
          <div key={stage.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={clsx(
                  "h-[2px] w-5 rounded-full transition-colors duration-500",
                  isPast ? "bg-[#25D366]" : isFailed ? "bg-red-400/40" : "bg-gray-600"
                )}
              />
            )}
            <div
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                isPast && "bg-[#25D366]/20 text-[#25D366]",
                isCurrent && "bg-[#c8ff00]/20 text-[#c8ff00] ring-2 ring-[#c8ff00]/40 animate-pulse",
                isFailed && "bg-red-500/20 text-red-400",
                !isPast && !isCurrent && !isFailed && "bg-gray-200 text-gray-400"
              )}
              title={stage.label}
            >
              <Icon size={13} />
            </div>
          </div>
        );
      })}
      {/* Final completed/failed dot */}
      <div
        className={clsx(
          "h-[2px] w-5 rounded-full transition-colors duration-500",
          isCompleted ? "bg-[#25D366]" : "bg-gray-300"
        )}
      />
      <div
        className={clsx(
          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
          isCompleted && "bg-[#25D366]/20 text-[#25D366]",
          isFailed && "bg-red-500/20 text-red-400",
          !isCompleted && !isFailed && "bg-gray-200 text-gray-400"
        )}
      >
        {isFailed ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        status === "completed" && "bg-[#25D366]/15 text-[#1a9e4a]",
        status === "failed" && "bg-red-100 text-red-600",
        status === "pending" && "bg-gray-100 text-gray-500",
        (status === "building_prompt" || status === "generating_image" || status === "generating_video" || status === "delivering") &&
          "bg-[#c8ff00]/15 text-[#7a9900]"
      )}
    >
      {(status === "building_prompt" || status === "generating_image" || status === "generating_video" || status === "delivering") && (
        <Loader2 size={10} className="animate-spin" />
      )}
      {label}
    </span>
  );
}

// ── Job Card ───────────────────────────────────────────────────
function JobCard({ job }: { job: WhatsAppJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-[#1a1a2e] shadow-xl",
        job.status === "failed"
          ? "border-red-500/30"
          : (job.status === "building_prompt" || job.status === "generating_image" || job.status === "generating_video" || job.status === "delivering")
            ? "border-[#c8ff00]/30"
            : job.status === "completed"
              ? "border-[#25D366]/20 hover:border-[#25D366]/40"
              : "border-gray-700/50"
      )}
    >
      {/* Progress shimmer for in-progress jobs */}
      {["building_prompt", "generating_image", "generating_video", "delivering"].includes(job.status) && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-[#c8ff00]/80 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
      )}

      <div className="p-5">
        {/* Header row: type badge + status + time */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                job.type === "image" && "bg-amber-500/20 text-amber-400",
                job.type === "clip" && "bg-violet-500/20 text-violet-400",
                job.type === "chat" && "bg-[#25D366]/20 text-[#25D366]"
              )}
            >
              {job.type === "clip" ? <Film size={16} /> : job.type === "chat" ? <Mic size={16} /> : <ImageIcon size={16} />}
            </span>
            <StatusBadge status={job.status} />
          </div>
          <span className="text-[11px] text-gray-400 font-medium">{relativeTime(job.createdAt)}</span>
        </div>

        {/* Pipeline dots */}
        <div className="mb-4">
          <PipelineDots status={job.status} />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-100 leading-relaxed mb-3 font-medium">
          &quot;{job.description}&quot;
        </p>

        {/* Enhanced prompt (collapsible) */}
        {job.enhancedPrompt && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-[#c8ff00] transition-colors font-medium"
            >
              <Sparkles size={10} className="text-[#c8ff00]/70" />
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Enhanced prompt
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-gray-400 leading-relaxed bg-black/30 rounded-xl p-3.5 border border-gray-700/40">
                {job.enhancedPrompt}
              </p>
            )}
          </div>
        )}

        {/* Output thumbnail */}
        {job.status === "completed" && job.outputPaths.length > 0 && (
          <div className="mb-3 flex gap-2.5 flex-wrap">
            {job.outputPaths.map((p) => {
              const url = mediaUrl(p);
              if (p.endsWith(".mp4")) {
                return (
                  <video
                    key={p}
                    src={url}
                    className="h-44 w-auto rounded-xl border border-gray-700/50 object-cover shadow-md"
                    controls
                    muted
                    preload="metadata"
                  />
                );
              }
              return (
                <img
                  key={p}
                  src={url}
                  alt={job.description}
                  className="h-44 w-auto rounded-xl border border-gray-700/50 object-cover shadow-md hover:scale-[1.02] hover:shadow-lg transition-all cursor-pointer"
                  loading="lazy"
                  onClick={() => window.open(url, "_blank")}
                />
              );
            })}
          </div>
        )}

        {/* Error */}
        {job.error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 mb-3">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300 leading-relaxed">{job.error}</p>
          </div>
        )}

        {/* Footer: timestamps + duration */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-3 border-t border-gray-700/30">
          <span suppressHydrationWarning>{new Date(job.createdAt).toLocaleTimeString()}</span>
          <div className="flex items-center gap-3">
            {job.completedAt && (
              <span className="flex items-center gap-1 text-[#25D366]">
                <Clock size={10} />
                {duration(job.createdAt, job.completedAt)}
              </span>
            )}
            <span className="font-mono text-[9px] text-gray-600">{job.id.slice(0, 16)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────
function StatsBar({ jobs }: { jobs: WhatsAppJob[] }) {
  const total = jobs.length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const inProgress = jobs.filter((j) =>
    ["pending", "building_prompt", "generating_image", "generating_video", "delivering"].includes(j.status)
  ).length;

  const stats = [
    { label: "Total", value: total, color: "text-gray-700", bg: "bg-white", border: "border-gray-200", icon: Zap, iconColor: "text-gray-200" },
    { label: "Completed", value: completed, color: "text-[#25D366]", bg: "bg-[#25D366]/5", border: "border-[#25D366]/20", icon: CheckCircle2, iconColor: "text-[#25D366]/15" },
    { label: "In Progress", value: inProgress, color: "text-[#9ab300]", bg: "bg-[#c8ff00]/5", border: "border-[#c8ff00]/20", icon: Loader2, iconColor: "text-[#c8ff00]/15" },
    { label: "Failed", value: failed, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", icon: AlertCircle, iconColor: "text-red-100" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={clsx(
            "relative overflow-hidden rounded-2xl p-4 text-center border shadow-sm",
            s.bg,
            s.border
          )}
        >
          <s.icon size={44} className={clsx("absolute -right-2 -top-2", s.iconColor)} />
          <div className={clsx("text-3xl font-bold tabular-nums relative", s.color)}>{s.value}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1 font-semibold relative">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Queue Status Bar ────────────────────────────────────────────
function QueueBar({ jobs }: { jobs: WhatsAppJob[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Only show jobs that are processing (not completed, not failed)
  const queued = jobs.filter(
    (j) => j.status !== "completed" && j.status !== "failed"
  );
  if (queued.length === 0) return null;

  const isActive = (s: string) =>
    ["building_prompt", "generating_image", "generating_video", "delivering"].includes(s);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
          Queue ({queued.length})
        </span>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Image
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-400" /> Clip
          </span>
        </div>
      </div>
      <div className="flex items-end gap-[5px]">
        {queued.map((job) => {
          const isClip = job.type === "clip";
          const active = isActive(job.status);
          const pending = job.status === "pending";

          return (
            <div
              key={job.id}
              className="relative"
              onMouseEnter={() => setHoveredId(job.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Vertical stick */}
              <div
                className={clsx(
                  "w-[10px] rounded-sm transition-all duration-300 cursor-pointer",
                  active ? "h-8" : "h-5",
                  // Clip colors
                  isClip && active && "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)] animate-pulse",
                  isClip && pending && "bg-violet-300/60",
                  // Image colors
                  !isClip && active && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse",
                  !isClip && pending && "bg-amber-300/60",
                  // Hover
                  "hover:brightness-125 hover:scale-x-[1.4]"
                )}
              />

              {/* Hover tooltip */}
              {hoveredId === job.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                  <div className="bg-[#1a1a2e] text-white rounded-xl px-3.5 py-2.5 text-[11px] shadow-xl border border-gray-700/50 whitespace-nowrap min-w-[180px]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        isClip ? "bg-violet-500/20 text-violet-300" : "bg-amber-500/20 text-amber-300"
                      )}>
                        {isClip ? <Film size={8} /> : <ImageIcon size={8} />}
                        {job.type}
                      </span>
                      <span className={clsx(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        active && "bg-[#c8ff00]/20 text-[#c8ff00]",
                        pending && "bg-gray-600 text-gray-300"
                      )}>
                        {job.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-gray-200 font-medium leading-snug max-w-[220px] truncate">
                      {job.description}
                    </p>
                    <div className="mt-1.5 text-[9px] text-gray-500" suppressHydrationWarning>
                      {relativeTime(job.createdAt)}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#1a1a2e] border-r border-b border-gray-700/50 rotate-45" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [jobs, setJobs] = useState<WhatsAppJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {
      // Silently retry on next poll
    } finally {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return (
    <div
      className="min-h-screen p-6 animate-[fadeIn_0.3s_ease-out]"
      style={{ background: "linear-gradient(135deg, #f0f4f0 0%, #e8f5e9 30%, #f5f5f5 70%, #eef2ee 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] shadow-lg shadow-[#25D366]/25">
            <MessageSquare size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">WhatsApp Pipeline</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Real-time generation tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400 font-medium">
            {lastRefresh && `Updated ${lastRefresh}`}
          </span>
          <button
            onClick={fetchJobs}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-400 hover:text-[#25D366] hover:shadow-md border border-gray-200 transition-all shadow-sm"
            title="Refresh now"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <StatsBar jobs={jobs} />
      </div>

      {/* Queue status bar */}
      <QueueBar jobs={jobs} />

      {/* Jobs list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-[#25D366] animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <MessageSquare size={36} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 font-medium">No WhatsApp jobs yet</p>
          <p className="text-xs text-gray-400 mt-2">
            Send &quot;molt generate [description]&quot; in the Higgs group
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
