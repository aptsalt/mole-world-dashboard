"use client";

import {
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pen,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import type { ResearchItem } from "./research-types";

interface ResearchItemCardProps {
  item: ResearchItem;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onTweet: (item: ResearchItem) => void;
  onCreateContent: (item: ResearchItem) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  x: "bg-white/10 text-white",
  instagram: "bg-pink-500/20 text-pink-400",
  tiktok: "bg-cyan-500/20 text-cyan-400",
  youtube: "bg-red-500/20 text-red-400",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  pending: Sparkles,
  selected: CheckCircle2,
  generating: Loader2,
  ready: CheckCircle2,
  posted: CheckCircle2,
  failed: AlertCircle,
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ResearchItemCard({
  item,
  index,
  selected,
  onToggle,
  onTweet,
  onCreateContent,
}: ResearchItemCardProps) {
  const StatusIcon = STATUS_ICONS[item.contentStatus] ?? Sparkles;
  const isGenerating = item.contentStatus === "generating";
  const hasMetrics = item.metrics.views > 0 || item.metrics.likes > 0;

  return (
    <div
      className={clsx(
        "rounded-xl border p-4 transition-all cursor-pointer",
        selected
          ? "border-sky-400/40 bg-sky-400/[0.06]"
          : "border-white/[0.07] bg-white/[0.03] hover:border-white/[0.14]",
      )}
      onClick={() => onToggle(item.id)}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <div
          className={clsx(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold transition-colors",
            selected
              ? "bg-sky-400 text-slate-900"
              : "bg-white/[0.06] text-white/40",
          )}
        >
          {index + 1}
        </div>

        {/* Thumbnail */}
        {item.thumbnailUrl && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white/5">
            <img
              src={item.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header: platform badge + status */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={clsx(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                PLATFORM_COLORS[item.platform] ?? "bg-white/10 text-white/60",
              )}
            >
              {item.platform}
            </span>
            {item.author && (
              <span className="text-[10px] text-white/40 truncate max-w-32">
                @{item.author}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-white/40 ml-auto">
              <StatusIcon
                size={12}
                className={clsx(isGenerating && "animate-spin")}
              />
              {item.contentStatus}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-white/80 leading-snug mb-1 line-clamp-2">
            {item.title}
          </h3>

          {/* Content preview */}
          {item.content && item.content !== item.title && (
            <p className="text-xs text-white/50 leading-relaxed mb-2 line-clamp-2">
              {item.content}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metrics + Scores + Actions */}
          <div className="flex items-center gap-3 text-[10px] text-white/40 flex-wrap">
            {hasMetrics && (
              <>
                {item.metrics.views > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye size={10} /> {formatNumber(item.metrics.views)}
                  </span>
                )}
                {item.metrics.likes > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart size={10} /> {formatNumber(item.metrics.likes)}
                  </span>
                )}
                {item.metrics.comments > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageCircle size={10} /> {formatNumber(item.metrics.comments)}
                  </span>
                )}
                {item.metrics.shares > 0 && (
                  <span className="flex items-center gap-1">
                    <Share2 size={10} /> {formatNumber(item.metrics.shares)}
                  </span>
                )}
                <span className="text-white/10">|</span>
              </>
            )}
            <span>Rel: {item.relevanceScore}/10</span>
            <span>Viral: {item.viralityScore}/10</span>
            <span>Pot: {item.contentPotentialScore}/10</span>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onTweet(item); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Pen size={10} /> Tweet
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCreateContent(item); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
              >
                <Zap size={10} /> Create
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-cyan-400/60 hover:text-cyan-400 transition-colors"
              >
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
