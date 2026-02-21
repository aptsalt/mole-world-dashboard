"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  Loader2,
  XCircle,
  RefreshCw,
  Image as ImageIcon,
  Search,
  Trash2,
  RotateCcw,
  Plus,
  Wifi,
  WifiOff,
  Eye,
  TrendingUp,
  Users,
  AlertCircle,
  Copy,
} from "lucide-react";
import { clsx } from "clsx";
import { getContentQueue } from "@/lib/api";
import { useToastStore } from "@/components/ui/toast";
import type { ContentPost, PlatformConfig } from "./types";
import { STATUS_CONFIG } from "./types";
import PostCard from "./PostCard";

// ── Types ──────────────────────────────────────────────────────
interface PlatformPageProps {
  platform: PlatformConfig;
  onCreatePost?: () => void;
  onEditPost?: (post: ContentPost) => void;
}

type FilterStatus = "all" | "draft" | "scheduled" | "posted" | "failed";

const FILTER_PILLS: { key: FilterStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { key: "all", label: "All", icon: ImageIcon, color: "text-white" },
  { key: "draft", label: "Draft", icon: Clock, color: "text-white/40" },
  { key: "scheduled", label: "Scheduled", icon: Calendar, color: "text-amber-400" },
  { key: "posted", label: "Posted", icon: CheckCircle2, color: "text-green-400" },
  { key: "failed", label: "Failed", icon: XCircle, color: "text-red-400" },
];

const CONNECTION_HELP: Record<string, string> = {
  x: "Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET environment variables.",
  instagram: "Log in to Instagram in the persistent browser profile at automation/browser-profile/.",
  youtube: "Log in to YouTube in the persistent browser profile at automation/browser-profile/.",
  tiktok: "Log in to TikTok in the persistent browser profile at automation/browser-profile/.",
};

// ── Skeleton ───────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="glass p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl skeleton" />
      <div className="space-y-1.5">
        <div className="w-8 h-5 skeleton" />
        <div className="w-12 h-2.5 skeleton" />
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-card/80 p-4">
      <div className="flex gap-3">
        <div className="w-24 h-24 rounded-lg skeleton shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-3/4 h-4 skeleton" />
          <div className="w-full h-3 skeleton" />
          <div className="w-1/2 h-3 skeleton" />
          <div className="flex gap-2 mt-3">
            <div className="w-12 h-5 skeleton rounded-full" />
            <div className="w-16 h-5 skeleton rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────
export default function PlatformPage({ platform, onCreatePost, onEditPost }: PlatformPageProps) {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
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
      .catch(() => {
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Filter to posts that have this platform
  const platformPosts = useMemo(() => {
    return posts.filter((p) => p.platforms[platform.key]);
  }, [posts, platform.key]);

  // Apply status filter + search
  const filteredPosts = useMemo(() => {
    let result = platformPosts;
    if (filter !== "all") {
      result = result.filter((p) => p.platforms[platform.key]?.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.storyTitle.toLowerCase().includes(q) ||
          p.caption.toLowerCase().includes(q)
      );
    }
    return result;
  }, [platformPosts, platform.key, filter, search]);

  // Stats
  const posted = useMemo(
    () => platformPosts.filter((p) => p.platforms[platform.key]?.status === "posted"),
    [platformPosts, platform.key]
  );
  const pending = useMemo(
    () => platformPosts.filter((p) => {
      const s = p.platforms[platform.key]?.status;
      return s && s !== "posted";
    }),
    [platformPosts, platform.key]
  );
  const scheduled = useMemo(
    () => platformPosts.filter((p) => p.scheduledAt),
    [platformPosts]
  );

  const isConnected = posted.length > 0;

  // ── Actions ────────────────────────────────────────────────
  async function handlePostNow(id: string) {
    setPostingId(id);
    try {
      const res = await fetch(`/api/content/queue/${id}/post`, { method: "POST" });
      if (res.ok) {
        addToast("success", `Posting to ${platform.label}...`);
      } else {
        addToast("error", `Failed to post — ${res.statusText}`);
      }
      fetchPosts();
    } catch {
      addToast("error", "Network error — check connection");
    }
    setPostingId(null);
  }

  async function handleRetry(id: string) {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const platforms = { ...post.platforms };
    if (platforms[platform.key]) {
      platforms[platform.key] = { ...platforms[platform.key], status: "draft" };
    }
    try {
      await fetch(`/api/content/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms }),
      });
      await fetch(`/api/content/queue/${id}/post`, { method: "POST" });
      addToast("info", "Retrying post...");
      fetchPosts();
    } catch {
      addToast("error", "Retry failed — check connection");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/content/queue/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("success", "Post deleted");
      }
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      fetchPosts();
    } catch {
      addToast("error", "Delete failed");
    }
  }

  async function handleDuplicate(id: string) {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const newId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newPlatforms: Record<string, unknown> = {};
    for (const [key, plat] of Object.entries(post.platforms)) {
      newPlatforms[key] = { enabled: plat.enabled, status: "draft", postedAt: null, postUrl: null };
    }
    try {
      await fetch("/api/content/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: {
            ...post,
            id: newId,
            storyTitle: `${post.storyTitle} (copy)`,
            platforms: newPlatforms,
            scheduledAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      addToast("success", "Post duplicated");
      fetchPosts();
    } catch {
      addToast("error", "Duplicate failed");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAll() {
    if (selected.size === filteredPosts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPosts.map((p) => p.id)));
    }
  }

  async function bulkDelete() {
    const total = selected.size;
    setBulkActing(true);
    setBulkProgress({ done: 0, total });
    let done = 0;
    for (const id of selected) {
      try {
        await fetch(`/api/content/queue/${id}`, { method: "DELETE" });
      } catch { /* ignore */ }
      done++;
      setBulkProgress({ done, total });
    }
    addToast("success", `Deleted ${done} posts`);
    setSelected(new Set());
    fetchPosts();
    setBulkActing(false);
  }

  async function bulkRetry() {
    const total = selected.size;
    setBulkActing(true);
    setBulkProgress({ done: 0, total });
    let done = 0;
    for (const id of selected) {
      await handleRetry(id);
      done++;
      setBulkProgress({ done, total });
    }
    addToast("info", `Retried ${done} posts`);
    setSelected(new Set());
    setBulkActing(false);
  }

  const PlatformIcon = platform.icon;

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div className="space-y-1.5">
            <div className="w-24 h-5 skeleton" />
            <div className="w-32 h-3 skeleton" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <div className="space-y-2">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", platform.bgColor)}>
            <PlatformIcon size={20} className={platform.color} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{platform.label}</h1>
            <p className="text-xs text-muted">
              {posted.length} posted &middot; {pending.length} pending &middot; {scheduled.length} scheduled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPosts}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-muted hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.10]"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
          {onCreatePost && (
            <button
              onClick={onCreatePost}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan/10 text-cyan hover:bg-cyan/20 transition-colors border border-cyan/20"
            >
              <Plus size={11} />
              Create Post
            </button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div
        className={clsx(
          "glass p-4 flex items-center gap-3",
          isConnected ? "glow-success" : "border-amber-500/20"
        )}
      >
        {isConnected ? (
          <>
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Wifi size={14} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">Connected</p>
              <p className="text-[10px] text-white/40">
                {platform.label} is configured and posting successfully &middot; Last posted {posted.length > 0 && posted[0].platforms[platform.key]?.postedAt ? new Date(posted[0].platforms[platform.key]!.postedAt!).toLocaleDateString() : "recently"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <WifiOff size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-400">Setup Required</p>
              <p className="text-[10px] text-white/40">
                {CONNECTION_HELP[platform.key] ?? "Configure platform credentials to enable posting."}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Posted", value: posted.length, color: "#22c55e", icon: CheckCircle2 },
          { label: "Pending", value: pending.length, color: "#f59e0b", icon: Clock },
          { label: "Scheduled", value: scheduled.length, color: "var(--cyan)", icon: Calendar },
        ].map((s) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3 stat-card">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <span className="text-lg font-bold text-white number-pop">{s.value}</span>
              <p className="text-[10px] text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Placeholder */}
      <div>
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-cyan" />
          Analytics
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[9px] text-white/30 font-medium">Coming Soon</span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Impressions", icon: Eye, color: "var(--cyan)" },
            { label: "Engagement", icon: TrendingUp, color: "var(--lime)" },
            { label: "Followers", icon: Users, color: "#f472b6" },
          ].map((a) => (
            <div key={a.label} className="glass p-4 flex items-center gap-3 opacity-50">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}10` }}>
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <div>
                <span className="text-lg font-bold text-white/30">--</span>
                <p className="text-[10px] text-muted">{a.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
          {FILTER_PILLS.map((pill) => {
            const Icon = pill.icon;
            const count =
              pill.key === "all" ? platformPosts.length
              : platformPosts.filter((p) => p.platforms[platform.key]?.status === pill.key).length;
            return (
              <button
                key={pill.key}
                onClick={() => setFilter(pill.key)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
                  filter === pill.key
                    ? "bg-white/[0.08] text-white"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                <Icon size={11} className={filter === pill.key ? pill.color : ""} />
                {pill.label}
                <span className="text-[9px] text-white/30">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-[240px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/30 focus:border-cyan/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cyan/[0.06] border border-cyan/20 animate-slide-up">
          <button
            onClick={selectAll}
            className="text-[11px] text-cyan font-medium"
          >
            {selected.size === filteredPosts.length ? "Deselect All" : "Select All"}
          </button>
          <span className="text-[11px] text-white/40">
            {selected.size} selected
            {bulkActing && ` (${bulkProgress.done}/${bulkProgress.total})`}
          </span>
          <div className="flex-1" />
          <button
            onClick={bulkRetry}
            disabled={bulkActing}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-[10px] text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-30"
          >
            <RotateCcw size={10} /> Retry
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulkActing}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-[10px] text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
          >
            {bulkActing ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
            Delete
          </button>
        </div>
      )}

      {/* Posts List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-2">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              platformKey={platform.key}
              selected={selected.has(post.id)}
              posting={postingId === post.id}
              onSelect={() => toggleSelect(post.id)}
              onEdit={onEditPost ? () => onEditPost(post) : undefined}
              onPostNow={() => handlePostNow(post.id)}
              onRetry={() => handleRetry(post.id)}
              onDelete={() => handleDelete(post.id)}
              onDuplicate={() => handleDuplicate(post.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-bg-card/30 p-12 text-center">
          {platformPosts.length === 0 ? (
            <>
              <ImageIcon size={32} className="text-white/15 mx-auto mb-3 empty-state-icon" />
              <p className="text-sm text-white/30">No content for {platform.label} yet</p>
              <p className="text-xs text-white/20 mt-1 mb-3">
                Generate content from Research & Pulse, then enable {platform.label} distribution
              </p>
              {onCreatePost && (
                <button
                  onClick={onCreatePost}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan/10 text-cyan text-xs font-medium hover:bg-cyan/20 transition-colors border border-cyan/20"
                >
                  <Plus size={12} /> Create Your First Post
                </button>
              )}
            </>
          ) : (
            <>
              <AlertCircle size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/30">No posts match your filters</p>
              <button
                onClick={() => { setFilter("all"); setSearch(""); }}
                className="text-xs text-cyan/60 hover:text-cyan mt-2 transition-colors"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
