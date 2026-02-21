"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  RefreshCw,
  Loader2,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  FileText,
  Calendar,
} from "lucide-react";
import { clsx } from "clsx";
import NewsCard from "@/components/content/NewsCard";
import ContentEditor from "@/components/content/ContentEditor";
import PostQueueCard from "@/components/content/PostQueueCard";

// ── Types ──────────────────────────────────────────────────────
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

interface NewsDigest {
  id: string;
  date: string;
  stories: NewsStory[];
  status: string;
  fetchedAt: string;
  sentAt: string | null;
  selectedStories: number[];
}

interface PlatformStatus {
  enabled: boolean;
  status: string;
  postedAt: string | null;
  postUrl: string | null;
}

interface ContentPost {
  id: string;
  storyTitle: string;
  storyUrl: string;
  storySource: string;
  caption: string;
  narrationScript: string;
  imagePrompt: string;
  motionPrompt: string;
  imagePath: string;
  videoPath: string | null;
  platforms: Record<string, PlatformStatus>;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ───────────────────────────────────────────────────────
export default function ContentPage() {
  const [digest, setDigest] = useState<NewsDigest | null>(null);
  const [contentQueue, setContentQueue] = useState<ContentPost[]>([]);
  const [selectedStories, setSelectedStories] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // ── Fetch data ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [digestRes, queueRes] = await Promise.all([
        fetch("/api/content/digest"),
        fetch("/api/content/queue"),
      ]);
      const digestData = await digestRes.json() as { digest: NewsDigest | null };
      const queueData = (await queueRes.json()) as ContentPost[];
      setDigest(digestData.digest);
      setContentQueue(Array.isArray(queueData) ? queueData : []);
    } catch {
      // Silently fail on network errors
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Actions ────────────────────────────────────────────────
  async function handleRefreshNews() {
    setRefreshing(true);
    try {
      await fetch("/api/content/digest", { method: "POST" });
      // Wait a bit then refresh
      setTimeout(fetchData, 3000);
    } catch { /* ignore */ }
    setRefreshing(false);
  }

  function toggleStory(index: number) {
    setSelectedStories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleGenerate() {
    if (selectedStories.size === 0) return;
    setGenerating(true);
    try {
      await fetch("/api/content/digest/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indices: [...selectedStories] }),
      });
      setSelectedStories(new Set());
      setTimeout(fetchData, 2000);
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function handleSavePost(id: string, updates: { caption?: string; narrationScript?: string }) {
    try {
      await fetch(`/api/content/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchData();
    } catch { /* ignore */ }
  }

  async function handleTogglePlatform(id: string, platform: string, enabled: boolean) {
    try {
      const post = contentQueue.find((p) => p.id === id);
      if (!post) return;
      const platforms = { ...post.platforms };
      platforms[platform] = { ...platforms[platform], enabled };
      await fetch(`/api/content/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms }),
      });
      fetchData();
    } catch { /* ignore */ }
  }

  async function handleSchedule(id: string, time: string) {
    try {
      await fetch(`/api/content/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: time }),
      });
      fetchData();
    } catch { /* ignore */ }
  }

  async function handlePostNow(id: string) {
    try {
      await fetch(`/api/content/queue/${id}/post`, { method: "POST" });
      fetchData();
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/content/queue/${id}`, { method: "DELETE" });
      if (activePostId === id) setActivePostId(null);
      fetchData();
    } catch { /* ignore */ }
  }

  const activePost = contentQueue.find((p) => p.id === activePostId);

  // ── Stats ──────────────────────────────────────────────────
  const stats = {
    totalContent: contentQueue.length,
    scheduled: contentQueue.filter((p) => Object.values(p.platforms).some((pl) => pl.status === "scheduled")).length,
    posted: contentQueue.filter((p) => Object.values(p.platforms).some((pl) => pl.status === "posted")).length,
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c8ff00]/20 to-cyan-400/20 flex items-center justify-center">
            <Newspaper size={20} className="text-[#c8ff00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Content Pipeline</h1>
            <p className="text-xs text-white/40">News → Generate → Review → Post</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          {[
            { label: "Content", value: stats.totalContent, icon: LayoutGrid, color: "text-cyan-400" },
            { label: "Scheduled", value: stats.scheduled, icon: Calendar, color: "text-amber-400" },
            { label: "Posted", value: stats.posted, icon: CheckCircle2, color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a2e]/60 border border-white/5">
              <s.icon size={14} className={s.color} />
              <span className="text-lg font-bold text-white">{s.value}</span>
              <span className="text-[10px] text-white/40 uppercase">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's News Section ────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#c8ff00]" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Today&apos;s News
            </h2>
            {digest && (
              <span className="text-[10px] text-white/30 ml-2">
                {digest.date} &middot; {digest.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedStories.size > 0 && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#c8ff00] text-[#0f0f1a] text-xs font-bold hover:bg-[#d4ff33] transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate {selectedStories.size} {selectedStories.size === 1 ? "story" : "stories"}
              </button>
            )}
            <button
              onClick={handleRefreshNews}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={clsx(refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {!digest ? (
          <div className="rounded-xl border border-white/10 bg-[#1a1a2e]/60 p-8 text-center">
            <Newspaper size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">No news digest yet today</p>
            <button
              onClick={handleRefreshNews}
              disabled={refreshing}
              className="mt-3 px-4 py-2 rounded-lg bg-[#c8ff00]/20 text-[#c8ff00] text-xs font-medium hover:bg-[#c8ff00]/30 transition-colors"
            >
              Fetch News Now
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            {digest.stories.map((story, i) => (
              <NewsCard
                key={story.id}
                story={story}
                index={i}
                selected={selectedStories.has(i + 1)}
                onToggle={toggleStory}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Content Editor Section ──────────────────────────── */}
      {contentQueue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Content Editor
            </h2>
            <span className="text-[10px] text-white/30 ml-2">
              {contentQueue.length} item{contentQueue.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Post selector tabs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {contentQueue.map((post) => (
              <button
                key={post.id}
                onClick={() => setActivePostId(post.id === activePostId ? null : post.id)}
                className={clsx(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  post.id === activePostId
                    ? "bg-[#c8ff00]/20 text-[#c8ff00] border border-[#c8ff00]/40"
                    : "bg-white/5 text-white/50 border border-white/10 hover:border-white/20",
                )}
              >
                {post.storyTitle.slice(0, 40)}{post.storyTitle.length > 40 ? "..." : ""}
              </button>
            ))}
          </div>

          {activePost ? (
            <ContentEditor post={activePost} onSave={handleSavePost} />
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#1a1a2e]/40 p-6 text-center text-sm text-white/30">
              Select a content item above to edit
            </div>
          )}
        </section>
      )}

      {/* ── Post Queue Section ──────────────────────────────── */}
      {contentQueue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Send size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Post Queue
            </h2>
          </div>

          <div className="grid gap-2">
            {contentQueue.map((post) => (
              <PostQueueCard
                key={post.id}
                post={post}
                onTogglePlatform={handleTogglePlatform}
                onSchedule={handleSchedule}
                onPostNow={handlePostNow}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {contentQueue.length === 0 && digest && (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#1a1a2e]/30 p-8 text-center">
          <Sparkles size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/30">
            Select stories above and click &quot;Generate&quot; to create content
          </p>
        </div>
      )}
    </div>
  );
}
