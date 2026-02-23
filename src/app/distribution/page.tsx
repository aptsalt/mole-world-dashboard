"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Send,
  CheckCircle2,
  Clock,
  Calendar,
  Activity,
  Plus,
  Loader2,
  BarChart3,
  XCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";
import { trackError } from "@/lib/error-tracker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getContentQueue } from "@/lib/api";
import { useToastStore } from "@/components/ui/toast";
import type { ContentPost } from "@/components/distribution/types";
import { PLATFORM_META, relativeTime } from "@/components/distribution/types";
import ContentCalendar from "@/components/distribution/ContentCalendar";
import PostCard from "@/components/distribution/PostCard";
import PostComposer from "@/components/distribution/PostComposer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Skeletons ────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="glass p-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-xl skeleton" />
      <div className="space-y-1.5">
        <div className="w-8 h-5 skeleton" />
        <div className="w-14 h-2.5 skeleton" />
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="w-8 h-8 rounded-md skeleton shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="w-3/4 h-3 skeleton" />
        <div className="w-1/2 h-2 skeleton" />
      </div>
    </div>
  );
}

export default function DistributionHub() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [isBatchPosting, setIsBatchPosting] = useState(false);
  const [confirmPostId, setConfirmPostId] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const isFirstLoad = useRef(true);

  const fetchPosts = useCallback(() => {
    getContentQueue()
      .then((data) => {
        setPosts(Array.isArray(data) ? data as ContentPost[] : []);
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          setLoading(false);
        }
      })
      .catch((err) => {
        trackError("distribution", "Failed to fetch content queue", "distribution/fetchPosts", "low", String(err));
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 15_000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // ── Stats ──────────────────────────────────────────────────
  const totalPosts = posts.length;
  const postedCount = useMemo(
    () => posts.filter((p) =>
      Object.values(p.platforms).some((pl) => pl.status === "posted")
    ).length,
    [posts]
  );
  const pendingCount = useMemo(
    () => posts.filter((p) =>
      Object.values(p.platforms).every((pl) => pl.status !== "posted") &&
      Object.values(p.platforms).some((pl) => pl.enabled)
    ).length,
    [posts]
  );
  const scheduledCount = useMemo(
    () => posts.filter((p) => p.scheduledAt && new Date(p.scheduledAt) > new Date()).length,
    [posts]
  );
  const failedCount = useMemo(
    () => posts.filter((p) =>
      Object.values(p.platforms).some((pl) => pl.status === "failed")
    ).length,
    [posts]
  );

  // Posts due today (scheduledAt in the past or today, with at least one "scheduled" platform)
  const dueTodayCount = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const scheduled = new Date(p.scheduledAt);
      if (scheduled > endOfDay) return false;
      return Object.values(p.platforms).some((pl) => pl.status === "scheduled");
    }).length;
  }, [posts]);

  // Total non-posted posts for queue indicator
  const totalPending = useMemo(
    () => posts.filter((p) => !Object.values(p.platforms).every((pl) => pl.status === "posted")).length,
    [posts]
  );

  // Quick queue: next 10 non-posted posts
  const quickQueue = useMemo(
    () => posts
      .filter((p) => !Object.values(p.platforms).every((pl) => pl.status === "posted"))
      .sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        if (a.scheduledAt) return -1;
        if (b.scheduledAt) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10),
    [posts]
  );

  // Activity feed: last 20 posting events (posted + failed)
  const activityFeed = useMemo(() => {
    const events: { id: string; postTitle: string; platform: string; status: string; time: string }[] = [];
    for (const post of posts) {
      for (const [key, plat] of Object.entries(post.platforms)) {
        if (plat.status === "posted" && plat.postedAt) {
          events.push({
            id: `${post.id}-${key}-posted`,
            postTitle: post.storyTitle,
            platform: key,
            status: "posted",
            time: plat.postedAt,
          });
        } else if (plat.status === "failed") {
          events.push({
            id: `${post.id}-${key}-failed`,
            postTitle: post.storyTitle,
            platform: key,
            status: "failed",
            time: post.updatedAt,
          });
        }
      }
    }
    return events
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20);
  }, [posts]);

  // Per-platform stats for quick overview
  const platformBreakdown = useMemo(() => {
    const breakdown: Record<string, { posted: number; pending: number; failed: number }> = {};
    for (const key of ["x", "instagram", "youtube", "tiktok"]) {
      breakdown[key] = { posted: 0, pending: 0, failed: 0 };
    }
    for (const post of posts) {
      for (const [key, plat] of Object.entries(post.platforms)) {
        if (!breakdown[key]) continue;
        if (plat.status === "posted") breakdown[key].posted++;
        else if (plat.status === "failed") breakdown[key].failed++;
        else if (plat.enabled) breakdown[key].pending++;
      }
    }
    return breakdown;
  }, [posts]);

  // ── Actions ────────────────────────────────────────────────
  const handlePostNow = useCallback(async (id: string) => {
    setPostingId(id);
    try {
      const res = await fetch(`/api/content/queue/${id}/post`, { method: "POST" });
      if (res.ok) {
        addToast("success", "Posting scheduled...");
      } else {
        addToast("error", "Failed to post");
      }
      fetchPosts();
    } catch {
      addToast("error", "Network error");
    }
    setPostingId(null);
  }, [addToast, fetchPosts]);

  const handleReschedule = useCallback(async (postId: string, date: Date) => {
    try {
      await fetch(`/api/content/queue/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: date.toISOString() }),
      });
      addToast("success", `Rescheduled to ${date.toLocaleDateString()}`);
      fetchPosts();
    } catch {
      addToast("error", "Failed to reschedule");
    }
  }, [addToast, fetchPosts]);

  const openComposer = useCallback((post?: ContentPost) => {
    setEditPost(post ?? null);
    setComposerOpen(true);
  }, []);

  const toggleBatchItem = useCallback((id: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchPost = useCallback(async () => {
    if (batchSelected.size === 0) return;
    setIsBatchPosting(true);
    const ids = Array.from(batchSelected);
    for (const id of ids) {
      await handlePostNow(id);
    }
    setBatchSelected(new Set());
    setIsBatchPosting(false);
  }, [batchSelected, handlePostNow]);

  // ── Stats config ───────────────────────────────────────────
  const stats = [
    { label: "Total Posts", value: totalPosts, color: "var(--cyan)", icon: BarChart3 },
    { label: "Posted", value: postedCount, color: "#22c55e", icon: CheckCircle2 },
    { label: "Pending", value: pendingCount, color: "#f59e0b", icon: Clock },
    { label: "Upcoming", value: scheduledCount, color: "var(--lime)", icon: Calendar },
  ];

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="w-40 h-6 skeleton" />
            <div className="w-56 h-3 skeleton" />
          </div>
          <div className="w-28 h-9 skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
        </div>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 h-[300px] skeleton rounded-xl" />
          <div className="col-span-2 space-y-5">
            <div className="glass overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="w-24 h-4 skeleton" />
              </div>
              <div className="p-2 space-y-1">
                <QueueSkeleton /><QueueSkeleton /><QueueSkeleton /><QueueSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={Send}
        title="Distribution Hub"
        subtitle="Create, schedule, and manage content across all platforms"
        actions={
          <button
            onClick={() => openComposer()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan/10 text-cyan text-sm font-medium hover:bg-cyan/20 transition-colors border border-cyan/20"
          >
            <Plus size={14} />
            Create Post
          </button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
          />
        ))}
      </div>

      {/* Due Today Indicator */}
      {dueTodayCount > 0 && (
        <div className="glass flex items-center gap-2.5 px-4 py-2.5 border-l-2 border-lime">
          <Clock size={14} className="text-lime shrink-0" />
          <span className="text-xs text-white/80">
            <span className="font-semibold text-lime">{dueTodayCount}</span>
            {" "}{dueTodayCount === 1 ? "post" : "posts"} due today
          </span>
          <span className="text-[10px] text-white/30 ml-auto">Auto-posting enabled</span>
        </div>
      )}

      {/* Platform Breakdown */}
      {totalPosts > 0 && (
        <div className="glass p-4">
          <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Platform Breakdown</h3>
          <div className="grid grid-cols-4 gap-2">
            {(["x", "instagram", "youtube", "tiktok"] as const).map((key) => {
              const meta = PLATFORM_META[key];
              const bd = platformBreakdown[key];
              const total = bd.posted + bd.pending + bd.failed;
              return (
                <Link
                  key={key}
                  href={`/distribution/${key}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: meta.dotColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">{meta.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {bd.posted > 0 && <span className="text-[10px] text-green-400">{bd.posted} posted</span>}
                      {bd.pending > 0 && <span className="text-[10px] text-amber-400">{bd.pending} pending</span>}
                      {bd.failed > 0 && <span className="text-[10px] text-red-400">{bd.failed} failed</span>}
                      {total === 0 && <span className="text-[10px] text-muted">No posts</span>}
                    </div>
                  </div>
                  <ArrowRight size={12} className="text-white/10 group-hover:text-muted transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-5 gap-5">
        {/* Left: Calendar (3 cols) */}
        <div className="col-span-3">
          <ContentCalendar
            posts={posts}
            onPostClick={(post) => openComposer(post)}
            onReschedule={handleReschedule}
          />
        </div>

        {/* Right: Quick Queue + Activity (2 cols) */}
        <div className="col-span-2 space-y-5">
          {/* Quick Queue */}
          <div className="glass overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Clock size={13} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-text">Quick Queue</h3>
              <span className="text-[10px] text-muted ml-auto">
                {quickQueue.length} of {totalPending} shown
              </span>
            </div>
            {/* Batch Action Bar */}
            {batchSelected.size > 0 && (
              <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2">
                <span className="text-[10px] text-muted">{batchSelected.size} selected</span>
                <button
                  onClick={handleBatchPost}
                  disabled={isBatchPosting}
                  className="flex items-center gap-1 rounded-lg bg-cyan/10 px-2 py-1 text-[10px] font-medium text-cyan hover:bg-cyan/20 disabled:opacity-50 transition-colors"
                >
                  {isBatchPosting ? (
                    <><RefreshCw size={10} className="animate-spin" /> Posting...</>
                  ) : (
                    <><Layers size={10} /> Post All</>
                  )}
                </button>
                <button
                  onClick={() => setBatchSelected(new Set())}
                  className="text-[10px] text-muted hover:text-white transition-colors ml-auto"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="p-2 max-h-[280px] overflow-y-auto space-y-0.5">
              {quickQueue.length > 0 ? (
                quickQueue.map((post) => (
                  <div key={post.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={batchSelected.has(post.id)}
                      onChange={() => toggleBatchItem(post.id)}
                      className="shrink-0 accent-cyan"
                    />
                    <div className="flex-1 min-w-0">
                      <PostCard
                        post={post}
                        compact
                        posting={postingId === post.id}
                        onPostNow={() => setConfirmPostId(post.id)}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Sparkles size={20} className="text-white/10 mx-auto mb-2 empty-state-icon" />
                  <p className="text-xs text-muted">Queue is clear</p>
                  <button
                    onClick={() => openComposer()}
                    className="text-[10px] text-cyan/50 hover:text-cyan mt-1.5 transition-colors"
                  >
                    Create your first post
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Activity size={13} className="text-cyan" />
              <h3 className="text-sm font-semibold text-text">Activity</h3>
              {failedCount > 0 && (
                <span className="text-[10px] text-red-400/70 ml-auto flex items-center gap-1">
                  <XCircle size={8} /> {failedCount} failed
                </span>
              )}
            </div>
            <div className="p-3 max-h-[280px] overflow-y-auto space-y-1 stagger-list">
              {activityFeed.length > 0 ? (
                activityFeed.map((event) => {
                  const meta = PLATFORM_META[event.platform];
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: meta?.dotColor ?? "#666" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/70 truncate">{event.postTitle}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={clsx(
                              "text-[10px] font-medium flex items-center gap-0.5",
                              event.status === "posted" ? "text-green-400" : "text-red-400"
                            )}
                          >
                            {event.status === "posted" ? (
                              <><CheckCircle2 size={8} /> Posted</>
                            ) : (
                              <><XCircle size={8} /> Failed</>
                            )}
                          </span>
                          <span className="text-[8px] text-muted">
                            to {meta?.label ?? event.platform}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted shrink-0">
                        {relativeTime(event.time)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Activity size={20} className="text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-muted">No activity yet</p>
                  <p className="text-[10px] text-muted mt-0.5">Post content to see activity here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Composer Modal */}
      {composerOpen && (
        <PostComposer
          post={editPost}
          onClose={() => { setComposerOpen(false); setEditPost(null); }}
          onSave={fetchPosts}
        />
      )}

      <ConfirmDialog
        open={confirmPostId !== null}
        title="Post Now?"
        message="This will immediately publish the content to the enabled platforms. This action cannot be undone."
        confirmLabel="Post Now"
        confirmVariant="warning"
        onConfirm={() => {
          if (confirmPostId) handlePostNow(confirmPostId);
          setConfirmPostId(null);
        }}
        onCancel={() => setConfirmPostId(null)}
      />
    </div>
  );
}
