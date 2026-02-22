"use client";

import { useState, memo } from "react";
import {
  Image as ImageIcon,
  Video,
  ChevronDown,
  ChevronUp,
  SkipForward,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Maximize2,
  Layers,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  AutomationQueueItem,
  AutomationShotStatus,
} from "@/lib/types";
import type { ShotMedia } from "@/components/production/preview-lightbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Status helpers ────────────────────────────────────────────

const STATUS_COLORS: Record<AutomationShotStatus, string> = {
  pending: "text-muted",
  generating_image: "text-cyan",
  assessing_image: "text-cyan",
  retrying_image: "text-warning",
  generating_video: "text-purple-400",
  assessing_video: "text-purple-400",
  retrying_video: "text-warning",
  downloading: "text-blue-400",
  completed: "text-success",
  failed: "text-red-400",
  paused_for_credits: "text-warning",
  skipped: "text-muted",
};

const STATUS_LABELS: Record<AutomationShotStatus, string> = {
  pending: "Pending",
  generating_image: "Generating Image",
  assessing_image: "Assessing Image",
  retrying_image: "Retrying Image",
  generating_video: "Generating Video",
  assessing_video: "Assessing Video",
  retrying_video: "Retrying Video",
  downloading: "Downloading",
  completed: "Completed",
  failed: "Failed",
  paused_for_credits: "Needs Credits",
  skipped: "Skipped",
};

const StatusBadge = memo(function StatusBadge({ status }: { status: AutomationShotStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        STATUS_COLORS[status],
        status === "completed" && "bg-success/10",
        status === "failed" && "bg-red-400/10",
        status === "paused_for_credits" && "bg-warning/10",
        (status === "generating_image" || status === "assessing_image") && "bg-cyan/10",
        (status === "generating_video" || status === "assessing_video") && "bg-purple-400/10",
        status === "pending" && "bg-white/[0.04]",
        status === "skipped" && "bg-white/[0.04]",
      )}
    >
      {(status.includes("generating") || status.includes("assessing")) && (
        <Loader2 size={10} className="animate-spin" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
});

// ── Component ────────────────────────────────────────

export function QueueTable({
  queue,
  media,
  onRetry,
  onSkip,
  onApprove,
  onPreview,
  onReorder,
}: {
  queue: AutomationQueueItem[];
  media: Map<string, ShotMedia>;
  onRetry: (shotId: string) => Promise<void>;
  onSkip: (shotId: string) => Promise<void>;
  onApprove: (shotId: string, approved: boolean) => Promise<void>;
  onPreview: (shot: ShotMedia) => void;
  onReorder?: (fromId: string, toId: string) => void;
}) {
  const [filter, setFilter] = useState<AutomationShotStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "retry" | "skip"; shotId: string } | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const filtered = filter === "all" ? queue : queue.filter((i) => i.status === filter);

  const statusCounts = queue.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  // Items eligible for batch selection (failed, pending, paused_for_credits)
  const selectableItems = filtered.filter(
    (i) => i.status === "failed" || i.status === "pending" || i.status === "paused_for_credits",
  );
  const allSelectableChecked =
    selectableItems.length > 0 && selectableItems.every((i) => selected.has(i.shotId));

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelectableChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableItems.map((i) => i.shotId)));
    }
  };

  const handleBatchRetry = async () => {
    if (selected.size === 0) return;
    setIsBatchRunning(true);
    const ids = Array.from(selected);
    for (const id of ids) {
      const item = queue.find((i) => i.shotId === id);
      if (item?.status === "failed") {
        await onRetry(id);
      }
    }
    setSelected(new Set());
    setIsBatchRunning(false);
  };

  const handleBatchSkip = async () => {
    if (selected.size === 0) return;
    setIsBatchRunning(true);
    const ids = Array.from(selected);
    for (const id of ids) {
      await onSkip(id);
    }
    setSelected(new Set());
    setIsBatchRunning(false);
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
        <button
          onClick={() => setFilter("all")}
          className={clsx(
            "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
            filter === "all" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white",
          )}
        >
          All ({queue.length})
        </button>
        {(Object.entries(statusCounts) as [AutomationShotStatus, number][]).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status as AutomationShotStatus)}
            className={clsx(
              "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
              filter === status ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white",
            )}
          >
            {STATUS_LABELS[status as AutomationShotStatus]} ({count})
          </button>
        ))}
      </div>

      {/* Batch Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2">
          <span className="text-[10px] text-muted">{selected.size} selected</span>
          <button
            onClick={handleBatchRetry}
            disabled={isBatchRunning}
            className="flex items-center gap-1 rounded-lg bg-cyan/10 px-2 py-1 text-[10px] font-medium text-cyan hover:bg-cyan/20 disabled:opacity-50 transition-colors"
          >
            {isBatchRunning ? (
              <><RefreshCw size={10} className="animate-spin" /> Running...</>
            ) : (
              <><RotateCcw size={10} /> Retry All</>
            )}
          </button>
          <button
            onClick={handleBatchSkip}
            disabled={isBatchRunning}
            className="flex items-center gap-1 rounded-lg bg-cyan/10 px-2 py-1 text-[10px] font-medium text-cyan hover:bg-cyan/20 disabled:opacity-50 transition-colors"
          >
            {isBatchRunning ? (
              <><RefreshCw size={10} className="animate-spin" /> Running...</>
            ) : (
              <><SkipForward size={10} /> Skip All</>
            )}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[10px] text-muted hover:text-white transition-colors ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-muted">
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={allSelectableChecked}
                  onChange={toggleAll}
                  disabled={selectableItems.length === 0}
                  className="accent-cyan"
                />
              </th>
              <th className="px-3 py-2 font-medium">Preview</th>
              <th className="px-3 py-2 font-medium">Shot</th>
              <th className="px-3 py-2 font-medium">Scene</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Image</th>
              <th className="px-3 py-2 font-medium">Video</th>
              <th className="px-3 py-2 font-medium">Quality</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  {queue.length === 0 ? "Queue is empty — run 'queue-add' to load shots" : "No shots match this filter"}
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const shotMedia = media.get(item.shotId);
              return (
                <tr
                  key={item.shotId}
                  draggable
                  onDragStart={(e) => {
                    setDragItem(item.shotId);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverItem(item.shotId);
                  }}
                  onDragLeave={() => setDragOverItem(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragItem && dragItem !== item.shotId) {
                      onReorder?.(dragItem, item.shotId);
                    }
                    setDragItem(null);
                    setDragOverItem(null);
                  }}
                  onDragEnd={() => {
                    setDragItem(null);
                    setDragOverItem(null);
                  }}
                  className={clsx(
                    "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]",
                    expanded === item.shotId && "bg-white/[0.02]",
                    dragItem === item.shotId && "opacity-50",
                    dragOverItem === item.shotId && dragItem !== item.shotId && "border-t-2 border-t-cyan",
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-1.5">
                    {(item.status === "failed" || item.status === "pending" || item.status === "paused_for_credits") && (
                      <input
                        type="checkbox"
                        checked={selected.has(item.shotId)}
                        onChange={() => toggleItem(item.shotId)}
                        className="accent-cyan"
                      />
                    )}
                  </td>
                  {/* Thumbnail */}
                  <td className="px-3 py-1.5">
                    {shotMedia?.heroImage ? (
                      <button
                        onClick={() => onPreview(shotMedia)}
                        className="overflow-hidden rounded-md border border-white/[0.08] transition-all hover:border-cyan/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${shotMedia.heroImage}`}
                          alt={item.shotId}
                          className="h-8 w-14 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="flex h-8 w-14 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02]">
                        <ImageIcon size={10} className="text-muted" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setExpanded(expanded === item.shotId ? null : item.shotId)}
                      className="flex items-center gap-1 font-mono text-white hover:text-cyan transition-colors"
                    >
                      {expanded === item.shotId ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {item.shotId}
                    </button>
                    {expanded === item.shotId && (
                      <div className="mt-2 space-y-1 text-muted">
                        <p className="text-[10px] line-clamp-2">{item.prompt}</p>
                        {item.error && <p className="text-[10px] text-red-400">Error: {item.error}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{item.sceneId}</td>
                  <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <ImageIcon size={10} className={shotMedia && shotMedia.images.length > 0 ? "text-success" : item.outputImagePath ? "text-success" : "text-muted"} />
                      <span className="text-muted">{item.imageModel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Video size={10} className={shotMedia && shotMedia.videos.length > 0 ? "text-purple-400" : item.outputVideoPath ? "text-success" : "text-muted"} />
                      <span className="text-muted">{item.videoModel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {item.imageQuality && (
                      <span className={clsx(
                        "font-mono text-[10px]",
                        item.imageQuality.score >= 7 ? "text-success" :
                        item.imageQuality.score >= 5 ? "text-warning" : "text-red-400",
                      )}>
                        {item.imageQuality.score}/10
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {shotMedia && (shotMedia.images.length > 0 || shotMedia.videos.length > 0) && (
                        <button
                          onClick={() => onPreview(shotMedia)}
                          className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
                          title="Preview"
                        >
                          <Maximize2 size={12} />
                        </button>
                      )}
                      {item.status === "failed" && (
                        <button
                          onClick={() => setConfirmAction({ type: "retry", shotId: item.shotId })}
                          className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
                          title="Retry"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                      {(item.status === "pending" || item.status === "failed") && (
                        <button
                          onClick={() => setConfirmAction({ type: "skip", shotId: item.shotId })}
                          className="rounded p-1 text-muted hover:text-warning hover:bg-warning/10 transition-colors"
                          title="Skip"
                        >
                          <SkipForward size={12} />
                        </button>
                      )}
                      {item.status === "paused_for_credits" && (
                        <>
                          <button
                            onClick={() => onApprove(item.shotId, true)}
                            className="rounded p-1 text-muted hover:text-success hover:bg-success/10 transition-colors"
                            title="Approve credits"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => onApprove(item.shotId, false)}
                            className="rounded p-1 text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Deny credits"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === "retry" ? "Retry Shot?" : "Skip Shot?"}
        message={confirmAction?.type === "retry"
          ? `Retry shot ${confirmAction?.shotId}? This will re-queue it for processing.`
          : `Skip shot ${confirmAction?.shotId}? This will remove it from the queue.`}
        confirmLabel={confirmAction?.type === "retry" ? "Retry" : "Skip"}
        confirmVariant={confirmAction?.type === "skip" ? "warning" : "default"}
        onConfirm={() => {
          if (confirmAction?.type === "retry") onRetry(confirmAction.shotId);
          else if (confirmAction?.type === "skip") onSkip(confirmAction.shotId);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
