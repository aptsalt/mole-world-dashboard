"use client";

import { Loader2, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

interface NewsStory {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  visualScore: number;
  shareabilityScore: number;
  rank: number;
  contentStatus: string;
  contentPostId: string | null;
}

interface NewsCardProps {
  story: NewsStory;
  index: number;
  selected: boolean;
  onToggle: (index: number) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  "Hacker News": "bg-orange-500/20 text-orange-400",
  ArXiv: "bg-purple-500/20 text-purple-400",
  "MIT Tech Review": "bg-red-500/20 text-red-400",
  "The Verge": "bg-blue-500/20 text-blue-400",
  "Towards Data Science": "bg-green-500/20 text-green-400",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  pending: Sparkles,
  generating: Loader2,
  ready: CheckCircle2,
  failed: AlertCircle,
};

export default function NewsCard({ story, index, selected, onToggle }: NewsCardProps) {
  const StatusIcon = STATUS_ICONS[story.contentStatus] ?? Sparkles;
  const isGenerating = story.contentStatus === "generating";

  return (
    <div
      className={clsx(
        "rounded-xl border p-4 transition-all cursor-pointer",
        selected
          ? "border-[#c8ff00]/60 bg-[#c8ff00]/5"
          : "border-white/10 bg-[#1a1a2e]/80 hover:border-white/20",
      )}
      onClick={() => onToggle(index + 1)}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <div
          className={clsx(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold transition-colors",
            selected
              ? "bg-[#c8ff00] text-[#0f0f1a]"
              : "bg-white/10 text-white/50",
          )}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: source badge + status */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={clsx(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                SOURCE_COLORS[story.source] ?? "bg-white/10 text-white/60",
              )}
            >
              {story.source}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <StatusIcon
                size={12}
                className={clsx(isGenerating && "animate-spin")}
              />
              {story.contentStatus}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-white/90 leading-snug mb-1">
            {story.title}
          </h3>

          {/* Summary */}
          <p className="text-xs text-white/50 leading-relaxed mb-2">
            {story.summary}
          </p>

          {/* Scores + link */}
          <div className="flex items-center gap-3 text-[10px] text-white/40">
            <span>Visual: {story.visualScore}/10</span>
            <span>Share: {story.shareabilityScore}/10</span>
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              <ExternalLink size={10} />
              Link
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
