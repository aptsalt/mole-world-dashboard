"use client";

import { useState } from "react";
import {
  Send,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { clsx } from "clsx";

interface PlatformStatus {
  enabled: boolean;
  status: string;
  postedAt: string | null;
  postUrl: string | null;
}

interface ContentPost {
  id: string;
  storyTitle: string;
  storySource: string;
  caption: string;
  imagePath: string;
  videoPath: string | null;
  platforms: Record<string, PlatformStatus>;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PostQueueCardProps {
  post: ContentPost;
  onTogglePlatform: (id: string, platform: string, enabled: boolean) => void;
  onSchedule: (id: string, time: string) => void;
  onPostNow: (id: string) => void;
  onDelete: (id: string) => void;
}

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  x: { label: "X", color: "text-white" },
  instagram: { label: "IG", color: "text-pink-400" },
  tiktok: { label: "TT", color: "text-cyan-400" },
  youtube: { label: "YT", color: "text-red-400" },
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  draft: { icon: Clock, color: "text-white/40" },
  scheduled: { icon: Calendar, color: "text-amber-400" },
  posted: { icon: CheckCircle2, color: "text-green-400" },
  failed: { icon: XCircle, color: "text-red-400" },
};

export default function PostQueueCard({
  post,
  onTogglePlatform,
  onSchedule,
  onPostNow,
  onDelete,
}: PostQueueCardProps) {
  const [scheduleTime, setScheduleTime] = useState(post.scheduledAt ?? "");
  const [posting, setPosting] = useState(false);

  const imageFilename = post.imagePath.split("/").pop() ?? "";
  const enabledCount = Object.values(post.platforms).filter((p) => p.enabled).length;

  async function handlePostNow() {
    setPosting(true);
    await onPostNow(post.id);
    setPosting(false);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a2e]/80 p-4">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {imageFilename && (
          <img
            src={`/api/content/media?file=${imageFilename}`}
            alt=""
            className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-white/90 truncate">{post.storyTitle}</h4>
          <p className="text-[10px] text-white/40 mt-0.5 truncate">{post.caption.slice(0, 80)}...</p>

          {/* Platform toggles */}
          <div className="flex items-center gap-2 mt-2">
            {Object.entries(PLATFORM_LABELS).map(([key, { label, color }]) => {
              const platform = post.platforms[key];
              if (!platform) return null;
              const style = STATUS_STYLES[platform.status] ?? STATUS_STYLES.draft;
              const StatusIcon = style.icon;

              return (
                <button
                  key={key}
                  onClick={() => onTogglePlatform(post.id, key, !platform.enabled)}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                    platform.enabled
                      ? `bg-white/10 ${color}`
                      : "bg-white/5 text-white/30",
                  )}
                >
                  <StatusIcon size={10} className={style.color} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Schedule + actions */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="datetime-local"
              value={scheduleTime ? scheduleTime.slice(0, 16) : ""}
              onChange={(e) => {
                const val = e.target.value;
                setScheduleTime(val);
                if (val) onSchedule(post.id, new Date(val).toISOString());
              }}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] text-white/60 focus:border-[#c8ff00]/50 focus:outline-none"
            />

            <button
              onClick={handlePostNow}
              disabled={posting || enabledCount === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#c8ff00]/20 text-[#c8ff00] text-[10px] font-medium hover:bg-[#c8ff00]/30 transition-colors disabled:opacity-30"
            >
              {posting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
              Post Now
            </button>

            <button
              onClick={() => onDelete(post.id)}
              className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
