"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Newspaper,
  RefreshCw,
  Loader2,
  Sparkles,
  Search,
  Calendar,
  BarChart3,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { getAllDigests, getContentQueue } from "@/lib/api";
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
  platforms: Record<string, { enabled: boolean; status: string; postedAt: string | null; postUrl: string | null }>;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type SourceFilter = "all" | "Hacker News" | "ArXiv" | "MIT Tech Review" | "The Verge" | "Towards Data Science";
type SortMode = "rank" | "visual" | "shareability";

const SOURCE_OPTIONS: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "All Sources" },
  { key: "Hacker News", label: "HN" },
  { key: "ArXiv", label: "ArXiv" },
  { key: "MIT Tech Review", label: "MIT TR" },
  { key: "The Verge", label: "Verge" },
  { key: "Towards Data Science", label: "TDS" },
];

// ── Page ───────────────────────────────────────────────────────
export default function ResearchNewsPage() {
  const [allDigests, setAllDigests] = useState<NewsDigest[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [minVisualScore, setMinVisualScore] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStories, setSelectedStories] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contentQueue, setContentQueue] = useState<ContentPost[]>([]);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [digestData, queueData] = await Promise.all([
        getAllDigests() as Promise<{ digests: NewsDigest[] }>,
        getContentQueue() as Promise<ContentPost[]>,
      ]);
      const digests = digestData.digests ?? [];
      setAllDigests(digests);
      if (!selectedDate && digests.length > 0) {
        setSelectedDate(digests[0].date);
      }
      setContentQueue(Array.isArray(queueData) ? queueData : []);
    } catch { /* ignore */ }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const currentDigest = useMemo(() => {
    if (!selectedDate) return allDigests[0] ?? null;
    return allDigests.find((d) => d.date === selectedDate) ?? null;
  }, [allDigests, selectedDate]);

  const filteredStories = useMemo(() => {
    if (!currentDigest) return [];
    let stories = currentDigest.stories;

    if (sourceFilter !== "all") {
      stories = stories.filter((s) => s.source === sourceFilter);
    }

    if (minVisualScore > 0) {
      stories = stories.filter((s) => s.visualScore >= minVisualScore);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      stories = stories.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q)
      );
    }

    stories = [...stories].sort((a, b) => {
      if (sortMode === "rank") return a.rank - b.rank;
      if (sortMode === "visual") return b.visualScore - a.visualScore;
      return b.shareabilityScore - a.shareabilityScore;
    });

    return stories;
  }, [currentDigest, sourceFilter, minVisualScore, sortMode, searchQuery]);

  const availableDates = useMemo(() => allDigests.map((d) => d.date), [allDigests]);

  const totalStories = useMemo(() =>
    allDigests.reduce((sum, d) => sum + d.stories.length, 0),
    [allDigests]
  );

  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDigests) {
      for (const s of d.stories) set.add(s.source);
    }
    return set.size;
  }, [allDigests]);

  // ── Actions ────────────────────────────────────────────────
  async function handleRefreshNews() {
    setRefreshing(true);
    try {
      await fetch("/api/content/digest", { method: "POST" });
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime/20 to-cyan-400/20 flex items-center justify-center">
            <Newspaper size={20} className="text-lime" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">News Feed</h2>
            <p className="text-xs text-muted">
              {totalStories} stories &middot; {uniqueSources} sources &middot; {allDigests.length} digests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedStories.size > 0 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lime text-btn-text text-xs font-bold hover:bg-lime/80 transition-colors disabled:opacity-50"
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
            Fetch News
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-muted" />
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            {availableDates.map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1.5">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSourceFilter(opt.key)}
              className={clsx(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
                sourceFilter === opt.key
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-white/[0.02] text-muted border-white/[0.10] hover:bg-white/[0.05]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={12} className="text-muted" />
          <span className="text-[10px] text-muted">Visual &ge;</span>
          <input
            type="range"
            min={0}
            max={10}
            value={minVisualScore}
            onChange={(e) => setMinVisualScore(Number(e.target.value))}
            className="w-20 accent-lime"
          />
          <span className="text-xs text-white font-mono w-4">{minVisualScore}</span>
        </div>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
        >
          <option value="rank">Sort by Rank</option>
          <option value="visual">Sort by Visual Score</option>
          <option value="shareability">Sort by Shareability</option>
        </select>

        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-52"
          />
        </div>
      </div>

      {/* Stories Grid */}
      {currentDigest ? (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-lime" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Stories
            </h2>
            <span className="text-[10px] text-white/30 ml-2">
              {filteredStories.length} of {currentDigest.stories.length} &middot; {currentDigest.date}
            </span>
          </div>
          <div className="grid gap-2">
            {filteredStories.map((story, i) => (
              <NewsCard
                key={story.id}
                story={story}
                index={i}
                selected={selectedStories.has(i + 1)}
                onToggle={toggleStory}
              />
            ))}
          </div>
          {filteredStories.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">
              No stories match the current filters
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-xl border border-white/10 bg-bg-card/60 p-8 text-center">
          <Newspaper size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No news digests available</p>
          <button
            onClick={handleRefreshNews}
            disabled={refreshing}
            className="mt-3 px-4 py-2 rounded-lg bg-lime/20 text-lime text-xs font-medium hover:bg-lime/30 transition-colors"
          >
            Fetch News Now
          </button>
        </div>
      )}

      {/* Content Editor */}
      {contentQueue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Content Editor
            </h2>
            <span className="text-[10px] text-white/30 ml-2">
              {contentQueue.length} item{contentQueue.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {contentQueue.map((post) => (
              <button
                key={post.id}
                onClick={() => setActivePostId(post.id === activePostId ? null : post.id)}
                className={clsx(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  post.id === activePostId
                    ? "bg-lime/20 text-lime border border-lime/40"
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
            <div className="rounded-xl border border-white/10 bg-bg-card/40 p-6 text-center text-sm text-white/30">
              Select a content item above to edit
            </div>
          )}
        </section>
      )}

      {/* Post Queue */}
      {contentQueue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-amber-400" />
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
    </div>
  );
}
