"use client";

import { useState, memo } from "react";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  Loader2,
  XCircle,
  ExternalLink,
  Trash2,
  Edit3,
  RotateCcw,
  Copy,
  Video,
} from "lucide-react";
import { clsx } from "clsx";
import type { ContentPost } from "./types";
import { PLATFORM_META, STATUS_CONFIG, relativeTime, getMediaUrl } from "./types";

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  draft: Clock,
  scheduled: Calendar,
  posted: CheckCircle2,
  failed: XCircle,
  posting: Loader2,
};

interface PostCardProps {
  post: ContentPost;
  /** Which platform page this card is shown on (null = hub/all) */
  platformKey?: string;
  compact?: boolean;
  selected?: boolean;
  posting?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onPostNow?: () => void;
  onRetry?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const PostCard = memo(function PostCard({
  post,
  platformKey,
  compact,
  selected,
  posting,
  onSelect,
  onEdit,
  onPostNow,
  onRetry,
  onDelete,
  onDuplicate,
}: PostCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Determine status for display
  const displayStatus = platformKey
    ? (post.platforms[platformKey]?.status ?? "draft")
    : getOverallStatus(post);

  const statusConf = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG.draft;
  const StatusIcon = STATUS_ICONS[displayStatus] ?? Clock;

  const hasVideo = !!post.videoPath;

  // ── Compact mode (hub quick queue) ──────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
        {post.imagePath ? (
          <div className="w-8 h-8 rounded-md shrink-0 relative overflow-hidden border border-white/10">
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={getMediaUrl(post.imagePath)}
              alt=""
              className={clsx("w-full h-full object-cover", !imgLoaded && "opacity-0")}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {hasVideo && (
              <div className="absolute bottom-0 right-0 p-0.5 bg-black/60 rounded-tl">
                <Video size={6} className="text-amber-400" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-md shrink-0 bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <Clock size={10} className="text-white/20" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/80 truncate">{post.storyTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {Object.keys(post.platforms).map((key) => {
              const meta = PLATFORM_META[key];
              if (!meta || !post.platforms[key]?.enabled) return null;
              return (
                <span
                  key={key}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: meta.dotColor }}
                  title={`${meta.label}: ${post.platforms[key]?.status ?? "draft"}`}
                />
              );
            })}
            {post.scheduledAt && (
              <span className="text-[9px] text-white/30">
                {new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span className={clsx("text-[8px]", statusConf.color)}>{statusConf.label}</span>
          </div>
        </div>
        {onPostNow && displayStatus !== "posted" && (
          <button
            onClick={(e) => { e.stopPropagation(); onPostNow(); }}
            disabled={posting}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-lime/20 text-lime text-[9px] font-medium hover:bg-lime/30 transition-all disabled:opacity-30"
          >
            {posting ? <Loader2 size={9} className="animate-spin" /> : <Send size={9} />}
            Post
          </button>
        )}
      </div>
    );
  }

  // ── Standard mode (platform pages) ─────────────────────
  return (
    <div
      className={clsx(
        "rounded-xl border bg-bg-card/80 p-4 transition-all hover-lift",
        selected ? "border-cyan/40 bg-cyan/[0.04]" : "border-white/10"
      )}
    >
      <div className="flex gap-3">
        {/* Checkbox */}
        {onSelect && (
          <button
            onClick={onSelect}
            aria-label={selected ? "Deselect post" : "Select post"}
            className={clsx(
              "w-5 h-5 mt-0.5 rounded border shrink-0 flex items-center justify-center transition-colors",
              selected
                ? "bg-cyan/20 border-cyan/50 text-cyan"
                : "border-white/20 hover:border-white/40"
            )}
          >
            {selected && <CheckCircle2 size={12} />}
          </button>
        )}

        {/* Thumbnail */}
        {post.imagePath ? (
          <div className="w-24 h-24 rounded-lg shrink-0 relative overflow-hidden border border-white/10">
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={getMediaUrl(post.imagePath)}
              alt=""
              className={clsx("w-full h-full object-cover transition-opacity duration-300", imgLoaded ? "opacity-100" : "opacity-0")}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {hasVideo && (
              <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[7px] text-amber-400 flex items-center gap-0.5">
                <Video size={7} /> Video
              </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg shrink-0 bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <Clock size={16} className="text-white/15" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white/90 truncate flex-1">{post.storyTitle}</h4>
            <span className={clsx("flex items-center gap-1 text-[10px] shrink-0", statusConf.color)}>
              <StatusIcon size={10} className={displayStatus === "posting" ? "animate-spin" : ""} />
              {statusConf.label}
            </span>
          </div>

          <p className="text-[11px] text-white/40 line-clamp-2">{post.caption.slice(0, 120)}</p>

          {/* Platform badges */}
          <div className="flex items-center gap-1.5 mt-2">
            {Object.entries(post.platforms).map(([key, plat]) => {
              const meta = PLATFORM_META[key];
              if (!meta) return null;
              return (
                <span
                  key={key}
                  className={clsx(
                    "px-2 py-0.5 rounded-full text-[9px] font-medium border flex items-center gap-1",
                    plat.status === "posted"
                      ? "border-green-500/30 text-green-400 bg-green-500/10"
                      : plat.status === "failed"
                      ? "border-red-500/30 text-red-400 bg-red-500/10"
                      : plat.status === "posting"
                      ? "border-lime/30 text-lime bg-lime/10"
                      : plat.enabled
                      ? "border-white/10 text-white/50 bg-white/[0.04]"
                      : "border-white/5 text-white/20 bg-white/[0.02]"
                  )}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: meta.dotColor }}
                  />
                  {meta.label}
                  {plat.status === "posted" && plat.postUrl && (
                    <a
                      href={plat.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex hover:text-green-300"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`View ${meta.label} post`}
                    >
                      <ExternalLink size={8} />
                    </a>
                  )}
                  {plat.status === "posting" && (
                    <Loader2 size={7} className="animate-spin" />
                  )}
                </span>
              );
            })}
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-3 mt-2 text-[9px] text-white/30">
            {post.scheduledAt && (
              <span className="flex items-center gap-1">
                <Calendar size={9} />
                {new Date(post.scheduledAt) > new Date()
                  ? `Scheduled ${new Date(post.scheduledAt).toLocaleDateString()} ${new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : `Was scheduled ${relativeTime(post.scheduledAt)}`}
              </span>
            )}
            <span>Created {relativeTime(post.createdAt)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Edit post"
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <Edit3 size={10} /> Edit
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                aria-label="Duplicate post"
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <Copy size={10} /> Duplicate
              </button>
            )}
            {onPostNow && displayStatus !== "posted" && (
              <button
                onClick={onPostNow}
                disabled={posting}
                aria-label="Post now"
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-lime/20 text-lime text-[10px] font-medium hover:bg-lime/30 transition-colors disabled:opacity-30"
              >
                {posting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                Post Now
              </button>
            )}
            {onRetry && displayStatus === "failed" && (
              <button
                onClick={onRetry}
                aria-label="Retry posting"
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <RotateCcw size={10} /> Retry
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                aria-label="Delete post"
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
              >
                <Trash2 size={10} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PostCard;

function getOverallStatus(post: ContentPost): string {
  const statuses = Object.values(post.platforms).map((p) => p.status);
  if (statuses.includes("posting")) return "posting";
  if (statuses.includes("failed")) return "failed";
  if (statuses.every((s) => s === "posted")) return "posted";
  if (statuses.includes("scheduled")) return "scheduled";
  return "draft";
}
