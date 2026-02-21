"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Send,
  Calendar,
  Hash,
  Loader2,
  Image as ImageIcon,
  Video,
  Info,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { useToastStore } from "@/components/ui/toast";
import type { ContentPost } from "./types";
import {
  PLATFORM_KEYS,
  PLATFORM_META,
  PLATFORM_CHAR_LIMITS,
  HASHTAG_PRESETS,
  OPTIMAL_TIMES,
  getMediaUrl,
} from "./types";
import PlatformPreview from "./PlatformPreview";

interface PostComposerProps {
  post?: ContentPost | null;
  onClose: () => void;
  onSave: () => void;
}

type Tab = "edit" | "preview";

export default function PostComposer({ post, onClose, onSave }: PostComposerProps) {
  const isEdit = !!post;
  const addToast = useToastStore((s) => s.addToast);
  const initialCaption = useRef(post?.caption ?? "");

  // ── State ──────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("edit");
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [platforms, setPlatforms] = useState<Record<string, boolean>>(() => {
    if (post) {
      const p: Record<string, boolean> = {};
      for (const key of PLATFORM_KEYS) {
        p[key] = !!post.platforms[key]?.enabled;
      }
      return p;
    }
    return { x: true, instagram: true, youtube: false, tiktok: false };
  });
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({});
  const [showPlatformOverride, setShowPlatformOverride] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">(
    post?.scheduledAt ? "schedule" : "now"
  );
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt?.slice(0, 16) ?? "");
  const [saving, setSaving] = useState(false);
  const [showOptimalTimes, setShowOptimalTimes] = useState(false);

  const enabledPlatforms = useMemo(
    () => PLATFORM_KEYS.filter((k) => platforms[k]),
    [platforms]
  );

  const imageUrl = post?.imagePath ? getMediaUrl(post.imagePath) : undefined;

  // Dirty check
  const isDirty = caption !== initialCaption.current || enabledPlatforms.length !== Object.values(post?.platforms ?? {}).filter((p) => p.enabled).length;

  // ── Validation ─────────────────────────────────────────────
  const charLimitExceeded = useMemo(() => {
    const exceeded: string[] = [];
    for (const key of enabledPlatforms) {
      const limit = PLATFORM_CHAR_LIMITS[key];
      const text = platformCaptions[key] || caption;
      if (text.length > limit) exceeded.push(PLATFORM_META[key].label);
    }
    return exceeded;
  }, [enabledPlatforms, caption, platformCaptions]);

  const isPastSchedule = scheduleMode === "schedule" && scheduledAt && new Date(scheduledAt) < new Date();

  const noPlatformSelected = enabledPlatforms.length === 0;

  // ── Close with unsaved changes guard ───────────────────────
  function handleClose() {
    if (isDirty && caption.trim()) {
      if (!window.confirm("You have unsaved changes. Discard?")) return;
    }
    onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDirty, caption]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────
  function togglePlatform(key: string) {
    setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function appendHashtags(tags: string[]) {
    const tagStr = "\n\n" + tags.join(" ");
    setCaption((prev) => prev + tagStr);
  }

  function getCaptionForPlatform(key: string): string {
    return platformCaptions[key] || caption;
  }

  async function handleSave() {
    // Validation
    if (noPlatformSelected) {
      addToast("warning", "Select at least one platform");
      return;
    }
    if (charLimitExceeded.length > 0) {
      addToast("warning", `Caption exceeds limit for ${charLimitExceeded.join(", ")}`);
      return;
    }
    if (isPastSchedule) {
      addToast("warning", "Scheduled time is in the past — adjust or switch to Post Now");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && post) {
        const updatedPlatforms: Record<string, unknown> = {};
        for (const key of PLATFORM_KEYS) {
          const existing = post.platforms[key];
          updatedPlatforms[key] = {
            enabled: platforms[key] ?? false,
            status: existing?.status ?? "draft",
            postedAt: existing?.postedAt ?? null,
            postUrl: existing?.postUrl ?? null,
          };
        }
        const res = await fetch(`/api/content/queue/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption,
            platforms: updatedPlatforms,
            scheduledAt: scheduleMode === "schedule" && scheduledAt
              ? new Date(scheduledAt).toISOString()
              : null,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        addToast("success", "Post updated successfully");
      } else {
        const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newPlatforms: Record<string, unknown> = {};
        for (const key of PLATFORM_KEYS) {
          newPlatforms[key] = {
            enabled: platforms[key] ?? false,
            status: "draft",
            postedAt: null,
            postUrl: null,
          };
        }
        const res = await fetch("/api/content/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: {
              id,
              storyTitle: caption.split("\n")[0]?.slice(0, 60) || "New Post",
              storySource: "dashboard",
              caption,
              imagePath: "",
              videoPath: null,
              platforms: newPlatforms,
              scheduledAt: scheduleMode === "schedule" && scheduledAt
                ? new Date(scheduledAt).toISOString()
                : null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        if (!res.ok) throw new Error("Create failed");
        addToast("success", "Post created successfully");
      }
      onSave();
      onClose();
    } catch {
      addToast("error", "Failed to save post — check connection");
    }
    setSaving(false);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-content p-0" role="dialog" aria-label={isEdit ? "Edit Post" : "Create Post"}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">
              {isEdit ? "Edit Post" : "Create Post"}
            </h2>
            {isDirty && (
              <span className="text-[9px] text-amber-400/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /> Unsaved
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
              {(["edit", "preview"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                    tab === t ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {tab === "edit" ? (
            <div className="space-y-5">
              {/* Platform Toggles */}
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                  Platforms
                  {noPlatformSelected && (
                    <span className="text-red-400/80 ml-2 normal-case text-[10px] font-normal">
                      Select at least one
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PLATFORM_KEYS.map((key) => {
                    const meta = PLATFORM_META[key];
                    return (
                      <button
                        key={key}
                        onClick={() => togglePlatform(key)}
                        className={clsx(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                          platforms[key]
                            ? `${meta.bgColor} border-white/20 text-white`
                            : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50"
                        )}
                      >
                        <span
                          className={clsx("w-2 h-2 rounded-full transition-opacity", platforms[key] ? "" : "opacity-30")}
                          style={{ background: meta.dotColor }}
                        />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className={clsx(
                    "w-full p-3 rounded-lg bg-white/[0.04] border text-sm text-white placeholder:text-white/30 focus:outline-none resize-none transition-colors",
                    charLimitExceeded.length > 0
                      ? "border-red-500/40 focus:border-red-500/60"
                      : "border-white/[0.08] focus:border-cyan/30"
                  )}
                  placeholder="Write your post caption..."
                />
                {/* Character counters */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {enabledPlatforms.map((key) => {
                    const limit = PLATFORM_CHAR_LIMITS[key];
                    const text = getCaptionForPlatform(key);
                    const remaining = limit - text.length;
                    const pct = remaining / limit;
                    const isOver = remaining < 0;
                    return (
                      <div key={key} className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: PLATFORM_META[key].dotColor }}
                        />
                        <span
                          className={clsx(
                            "text-[10px] font-medium tabular-nums",
                            isOver ? "text-red-400 font-bold" : pct > 0.2 ? "text-green-400" : "text-amber-400"
                          )}
                        >
                          {isOver && <AlertTriangle size={8} className="inline mr-0.5" />}
                          {remaining}
                        </span>
                        <button
                          onClick={() => setShowPlatformOverride(showPlatformOverride === key ? null : key)}
                          className="text-[9px] text-white/30 hover:text-cyan/60 transition-colors"
                        >
                          Customize
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* Over limit warning */}
                {charLimitExceeded.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400/80">
                    <AlertCircle size={10} />
                    Caption exceeds character limit for {charLimitExceeded.join(", ")}
                  </div>
                )}
                {/* Platform-specific override */}
                {showPlatformOverride && (
                  <div className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] animate-slide-up">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-white/40">
                        Custom caption for {PLATFORM_META[showPlatformOverride]?.label}
                      </label>
                      {platformCaptions[showPlatformOverride] && (
                        <button
                          onClick={() => setPlatformCaptions((prev) => {
                            const next = { ...prev };
                            delete next[showPlatformOverride!];
                            return next;
                          })}
                          className="text-[9px] text-white/30 hover:text-red-400 transition-colors"
                        >
                          Reset to main
                        </button>
                      )}
                    </div>
                    <textarea
                      value={platformCaptions[showPlatformOverride] ?? caption}
                      onChange={(e) =>
                        setPlatformCaptions((prev) => ({
                          ...prev,
                          [showPlatformOverride!]: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full p-2 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder:text-white/20 focus:border-cyan/20 focus:outline-none resize-none"
                    />
                    <div className="mt-1 text-[9px] text-white/30">
                      {PLATFORM_CHAR_LIMITS[showPlatformOverride] - (platformCaptions[showPlatformOverride] ?? caption).length} chars remaining
                    </div>
                  </div>
                )}
              </div>

              {/* Media */}
              {post && (post.imagePath || post.videoPath) && (
                <div>
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                    Media
                  </label>
                  <div className="flex items-center gap-3">
                    {post.imagePath && (
                      <div className="relative group">
                        <img
                          src={getMediaUrl(post.imagePath)}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border border-white/10 transition-transform group-hover:scale-105"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-medium bg-black/60 text-white/60 flex items-center gap-0.5">
                          <ImageIcon size={8} /> 1:1
                        </span>
                      </div>
                    )}
                    {post.videoPath && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <Video size={14} className="text-amber-400" />
                        <span className="text-xs text-white/60">Video attached</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hashtag Presets */}
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                  Hashtags
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {HASHTAG_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => appendHashtags(preset.tags)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Hash size={11} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                  Scheduling
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setScheduleMode("now")}
                    className={clsx(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      scheduleMode === "now"
                        ? "bg-lime/10 border-lime/30 text-lime"
                        : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50"
                    )}
                  >
                    <Send size={13} /> Post Now
                  </button>
                  <button
                    onClick={() => setScheduleMode("schedule")}
                    className={clsx(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      scheduleMode === "schedule"
                        ? "bg-cyan/10 border-cyan/30 text-cyan"
                        : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50"
                    )}
                  >
                    <Calendar size={13} /> Schedule
                  </button>
                </div>

                {scheduleMode === "schedule" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className={clsx(
                          "bg-white/[0.04] border rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors",
                          isPastSchedule
                            ? "border-red-500/40 focus:border-red-500/60"
                            : "border-white/[0.08] focus:border-cyan/30"
                        )}
                      />
                      <div className="relative">
                        <button
                          onClick={() => setShowOptimalTimes(!showOptimalTimes)}
                          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-cyan/60 transition-colors"
                        >
                          <Info size={10} /> Optimal times
                        </button>
                        {showOptimalTimes && (
                          <div className="absolute top-full mt-1 left-0 p-3 rounded-lg bg-bg-light border border-white/[0.12] z-10 min-w-[180px] shadow-xl animate-slide-up">
                            {enabledPlatforms.map((key) => (
                              <div key={key} className="mb-2 last:mb-0">
                                <span className="text-[9px] font-semibold text-white/40">{PLATFORM_META[key].label}</span>
                                <div className="flex gap-1 mt-0.5">
                                  {OPTIMAL_TIMES[key]?.map((t) => (
                                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {isPastSchedule && (
                      <div className="flex items-center gap-1.5 text-[10px] text-red-400/80">
                        <AlertTriangle size={10} />
                        This time is in the past — the post will be sent immediately
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Preview Tab */
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {enabledPlatforms.length > 0 ? (
                enabledPlatforms.map((key) => (
                  <PlatformPreview
                    key={key}
                    platform={key}
                    caption={getCaptionForPlatform(key)}
                    imageUrl={imageUrl}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-12">
                  <AlertCircle size={24} className="text-white/15 mx-auto mb-2" />
                  <p className="text-sm text-white/30">Enable at least one platform to see previews</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {charLimitExceeded.length > 0 && (
              <span className="text-[9px] text-red-400/60 flex items-center gap-1">
                <AlertTriangle size={9} /> Over limit
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !caption.trim() || noPlatformSelected || charLimitExceeded.length > 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan/20 text-cyan text-sm font-medium hover:bg-cyan/30 transition-colors disabled:opacity-30 border border-cyan/20"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isEdit ? "Save Changes" : scheduleMode === "now" ? "Create & Post" : "Schedule Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
