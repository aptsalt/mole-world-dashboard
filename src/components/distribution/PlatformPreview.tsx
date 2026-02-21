"use client";

import { clsx } from "clsx";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Music,
} from "lucide-react";

interface PlatformPreviewProps {
  platform: string;
  caption: string;
  imageUrl?: string;
  username?: string;
}

export default function PlatformPreview({
  platform,
  caption,
  imageUrl,
  username = "@moleworld",
}: PlatformPreviewProps) {
  switch (platform) {
    case "x":
      return <XPreview caption={caption} imageUrl={imageUrl} username={username} />;
    case "instagram":
      return <InstagramPreview caption={caption} imageUrl={imageUrl} username={username} />;
    case "youtube":
      return <YouTubePreview caption={caption} imageUrl={imageUrl} username={username} />;
    case "tiktok":
      return <TikTokPreview caption={caption} imageUrl={imageUrl} username={username} />;
    default:
      return null;
  }
}

// ── X / Twitter Preview ─────────────────────────────────────
function XPreview({ caption, imageUrl, username }: { caption: string; imageUrl?: string; username: string }) {
  const truncated = caption.length > 280 ? caption.slice(0, 277) + "..." : caption;
  return (
    <div className="glass overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-white/60">X Preview</span>
      </div>
      <div className="p-4" style={{ background: "#16181c" }}>
        {/* Tweet card */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/30 to-cyan/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-cyan">MW</span>
          </div>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">Mole World</span>
              <span className="text-xs text-white/40">{username}</span>
              <span className="text-xs text-white/30">&middot; now</span>
            </div>
            {/* Body */}
            <p className="text-[13px] text-white/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
              {truncated}
            </p>
            {/* Media */}
            {imageUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
                <img src={imageUrl} alt="" className="w-full h-48 object-cover" />
              </div>
            )}
            {/* Actions */}
            <div className="flex items-center justify-between mt-3 max-w-[300px] text-white/30">
              <button className="flex items-center gap-1 text-[11px] hover:text-cyan transition-colors">
                <MessageCircle size={14} /> <span>0</span>
              </button>
              <button className="flex items-center gap-1 text-[11px] hover:text-green-400 transition-colors">
                <Repeat2 size={14} /> <span>0</span>
              </button>
              <button className="flex items-center gap-1 text-[11px] hover:text-pink-400 transition-colors">
                <Heart size={14} /> <span>0</span>
              </button>
              <button className="flex items-center gap-1 text-[11px] hover:text-cyan transition-colors">
                <Bookmark size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Instagram Preview ───────────────────────────────────────
function InstagramPreview({ caption, imageUrl, username }: { caption: string; imageUrl?: string; username: string }) {
  const displayCaption = caption.length > 125 ? caption.slice(0, 125) + "..." : caption;
  return (
    <div className="glass overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-pink-400/60">Instagram Preview</span>
      </div>
      <div className="bg-black">
        {/* Profile header */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-amber-400 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">MW</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-white">moleworld</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6" className="ml-0.5">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        {/* Image */}
        <div className="aspect-square bg-[#1a1a1a]">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/10 text-sm">No image</div>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-4 px-3 py-2.5">
          <Heart size={22} className="text-white hover:text-red-400 transition-colors cursor-pointer" />
          <MessageCircle size={22} className="text-white hover:text-white/60 transition-colors cursor-pointer" />
          <Share2 size={22} className="text-white hover:text-white/60 transition-colors cursor-pointer" />
          <div className="flex-1" />
          <Bookmark size={22} className="text-white hover:text-white/60 transition-colors cursor-pointer" />
        </div>
        {/* Caption */}
        <div className="px-3 pb-3">
          <p className="text-xs text-white leading-relaxed">
            <span className="font-semibold mr-1">moleworld</span>
            {displayCaption}
            {caption.length > 125 && (
              <span className="text-white/40 ml-1 cursor-pointer">more</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── YouTube Shorts Preview ──────────────────────────────────
function YouTubePreview({ caption, imageUrl, username }: { caption: string; imageUrl?: string; username: string }) {
  return (
    <div className="glass overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-red-400/60">YouTube Shorts Preview</span>
      </div>
      <div className="relative mx-auto" style={{ width: 200, aspectRatio: "9/16", background: "#0f0f0f" }}>
        {/* Background image */}
        {imageUrl && (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
        {/* Channel info */}
        <div className="absolute bottom-3 left-3 right-12">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center">
              <span className="text-[6px] font-bold text-white">MW</span>
            </div>
            <span className="text-[9px] font-medium text-white/80">Mole World</span>
          </div>
          <p className="text-[8px] text-white/70 line-clamp-2 leading-relaxed">{caption.slice(0, 100)}</p>
        </div>
        {/* Right side actions */}
        <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4">
          {[
            { icon: ThumbsUp, label: "0" },
            { icon: ThumbsDown, label: "" },
            { icon: MessageCircle, label: "0" },
            { icon: Share2, label: "" },
          ].map((a, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <a.icon size={16} className="text-white/80" />
              {a.label && <span className="text-[7px] text-white/50">{a.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TikTok Preview ──────────────────────────────────────────
function TikTokPreview({ caption, imageUrl, username }: { caption: string; imageUrl?: string; username: string }) {
  return (
    <div className="glass overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-cyan-400/60">TikTok Preview</span>
      </div>
      <div className="relative mx-auto" style={{ width: 200, aspectRatio: "9/16", background: "#000" }}>
        {/* Background image */}
        {imageUrl && (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
        {/* User info */}
        <div className="absolute bottom-3 left-3 right-12">
          <p className="text-[9px] font-semibold text-white mb-1">{username}</p>
          <p className="text-[8px] text-white/70 line-clamp-2 leading-relaxed">{caption.slice(0, 100)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <Music size={8} className="text-white/50" />
            <span className="text-[7px] text-white/40">Original sound - Mole World</span>
          </div>
        </div>
        {/* Right side actions */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
          {[
            { icon: Heart, label: "0" },
            { icon: MessageCircle, label: "0" },
            { icon: Bookmark, label: "0" },
            { icon: Share2, label: "0" },
          ].map((a, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <a.icon size={18} className="text-white/80" />
              <span className="text-[7px] text-white/50">{a.label}</span>
            </div>
          ))}
        </div>
        {/* Music disc */}
        <div className="absolute right-2.5 bottom-3 w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/10 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
