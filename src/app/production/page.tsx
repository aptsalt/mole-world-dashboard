"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Brain,
  Monitor,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { trackError } from "@/lib/error-tracker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SkeletonStatRow, SkeletonList, SkeletonLine, SkeletonBlock, SkeletonCard } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/lib/store";
import { automationQueueAction, approveCredits } from "@/lib/api";
import type {
  AutomationServiceStatus,
  AutomationQueueStats,
} from "@/lib/types";

// ── Extracted components ─────────────────────────────
import { MediaGallery } from "@/components/production/media-gallery";
import { PreviewLightbox } from "@/components/production/preview-lightbox";
import type { ShotMedia } from "@/components/production/preview-lightbox";
import { QueueTable } from "@/components/production/queue-table";
import { EventFeed } from "@/components/production/event-feed";
import { WorkerPanel } from "@/components/production/worker-panel";

// ── Components ────────────────────────────────────────────────

function ServiceStatusCard({ status }: { status: AutomationServiceStatus | null }) {
  if (!status) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-muted">
          <Monitor size={16} />
          <span className="text-sm">No automation data available</span>
        </div>
      </div>
    );
  }

  const stateColor =
    status.state === "running" ? "text-success" :
    status.state === "paused" ? "text-warning" :
    status.state === "error" ? "text-red-400" :
    "text-muted";

  const stateIcon =
    status.state === "running" ? <Play size={14} className="text-success" /> :
    status.state === "paused" ? <Pause size={14} className="text-warning" /> :
    status.state === "error" ? <XCircle size={14} className="text-red-400" /> :
    <Square size={14} className="text-muted" />;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stateIcon}
          <div>
            <span className={clsx("text-sm font-semibold capitalize", stateColor)}>
              {status.state}
            </span>
            {status.currentShot && (
              <p className="text-xs text-muted mt-0.5">
                {status.currentShot} — {status.currentStep?.replace(/_/g, " ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <div className="flex items-center gap-1">
            <Brain size={12} className={status.ollamaConnected ? "text-success" : "text-red-400"} />
            <span>Ollama</span>
          </div>
          <div className="flex items-center gap-1">
            <Monitor size={12} className={status.browserConnected ? "text-success" : "text-red-400"} />
            <span>Browser</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueStatsBar({ stats }: { stats: AutomationQueueStats | undefined }) {
  if (!stats || stats.total === 0) return null;

  const completedPct = (stats.completed / stats.total) * 100;
  const failedPct = (stats.failed / stats.total) * 100;
  const inProgressPct = (stats.inProgress / stats.total) * 100;
  const creditsPct = (stats.pausedForCredits / stats.total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{stats.completed} / {stats.total} shots complete</span>
        <span>{Math.round(completedPct)}%</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="bg-success transition-all" style={{ width: `${completedPct}%` }} />
        <div className="bg-cyan transition-all" style={{ width: `${inProgressPct}%` }} />
        <div className="bg-warning transition-all" style={{ width: `${creditsPct}%` }} />
        <div className="bg-red-400 transition-all" style={{ width: `${failedPct}%` }} />
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Done {stats.completed}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan" /> Active {stats.inProgress}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white/20" /> Pending {stats.pending}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Credits {stats.pausedForCredits}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Failed {stats.failed}</span>
        {stats.skipped > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white/10" /> Skipped {stats.skipped}</span>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductionPage() {
  const { automationStatus, automationQueue, automationEvents, refreshAutomation } = useDashboardStore();
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shotMedia, setShotMedia] = useState<ShotMedia[]>([]);
  const [mediaMap, setMediaMap] = useState<Map<string, ShotMedia>>(new Map());
  const [previewShot, setPreviewShot] = useState<ShotMedia | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/automation/media", { cache: "no-store" });
      if (!res.ok) return;
      const data: ShotMedia[] = await res.json();
      setShotMedia(data);
      const map = new Map<string, ShotMedia>();
      for (const item of data) {
        map.set(item.shotId, item);
      }
      setMediaMap(map);
    } catch (err) {
      trackError("automation", "Failed to fetch media", "production/fetchMedia", "low", String(err));
    }
  }, []);

  useEffect(() => {
    Promise.all([refreshAutomation(), fetchMedia()]).finally(() => setInitialLoad(false));
    const interval = setInterval(() => {
      refreshAutomation();
      fetchMedia();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAutomation, fetchMedia]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAutomation(), fetchMedia()]);
    setRefreshing(false);
  }, [refreshAutomation, fetchMedia]);

  const handleRetry = useCallback(async (shotId: string) => {
    await automationQueueAction(shotId, "retry");
    await refreshAutomation();
  }, [refreshAutomation]);

  const handleSkip = useCallback(async (shotId: string) => {
    await automationQueueAction(shotId, "skip");
    await refreshAutomation();
  }, [refreshAutomation]);

  const handleApprove = useCallback(async (shotId: string, approved: boolean) => {
    await approveCredits(shotId, approved);
    await refreshAutomation();
  }, [refreshAutomation]);

  const handleReorder = useCallback(async (fromId: string, toId: string) => {
    try {
      await fetch("/api/automation/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", fromId, toId }),
      });
      await refreshAutomation();
    } catch {
      // Silently fail - order will revert on next refresh
    }
  }, [refreshAutomation]);

  const stats = automationStatus?.queueStats;

  if (initialLoad) {
    return (
      <div className="space-y-4 p-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <SkeletonLine className="w-40 h-5" />
              <SkeletonLine className="w-64 h-3" />
            </div>
          </div>
          <SkeletonBlock className="w-20 h-8" />
        </div>
        {/* Status + Stats row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        {/* Stat cards row */}
        <SkeletonStatRow count={6} />
        {/* Queue table placeholder */}
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SkeletonList rows={6} />
          </div>
          <div>
            <SkeletonList rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <PageHeader
        icon={Zap}
        iconBg="bg-cyan/10"
        title="Production Pipeline"
        subtitle="Higgsfield automation — local LLM + Playwright"
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-all"
            disabled={refreshing}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Status + Stats row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ServiceStatusCard status={automationStatus} />
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <QueueStatsBar stats={stats} />
          {(!stats || stats.total === 0) && (
            <div className="text-xs text-muted">
              <p>No queue data. Start the automation service:</p>
              <code className="mt-1 block rounded bg-white/[0.04] px-2 py-1 font-mono text-[10px]">
                cd automation && npm install && npx tsx src/index.ts queue-add --all
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Total", value: stats.total, icon: Clock, color: "text-white" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-success" },
            { label: "In Progress", value: stats.inProgress, icon: Loader2, color: "text-cyan" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-muted" },
            { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-400" },
            { label: "Credits", value: stats.pausedForCredits, icon: AlertTriangle, color: "text-warning" },
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
      )}

      {/* Media Gallery */}
      {shotMedia.length > 0 && (
        <MediaGallery media={shotMedia} onMediaDeleted={fetchMedia} />
      )}

      {/* Main content: Queue table + Workers + Event feed */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QueueTable
            queue={automationQueue}
            media={mediaMap}
            onRetry={handleRetry}
            onSkip={handleSkip}
            onApprove={handleApprove}
            onPreview={setPreviewShot}
            onReorder={handleReorder}
          />
        </div>
        <div className="space-y-4">
          <WorkerPanel />
          <EventFeed events={automationEvents} />
        </div>
      </div>

      {/* CLI Help */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white mb-2">CLI Commands</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { cmd: "npx tsx src/index.ts start", desc: "Start automation (opens browser)" },
            { cmd: "npx tsx src/index.ts start --headless", desc: "Run headless overnight" },
            { cmd: "npx tsx src/index.ts status", desc: "Check current status" },
            { cmd: "npx tsx src/index.ts queue-add --all", desc: "Load 89 shots into queue" },
            { cmd: "npm run batch-video:dry", desc: "Preview batch video plan" },
            { cmd: "npm run batch-video", desc: "Generate 3 videos per shot (Hailuo, Kling, Seedance)" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
              <code className="block font-mono text-[10px] text-cyan">{cmd}</code>
              <p className="mt-0.5 text-[10px] text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox from queue table preview */}
      {previewShot && (
        <PreviewLightbox shot={previewShot} onClose={() => setPreviewShot(null)} />
      )}
    </div>
  );
}
