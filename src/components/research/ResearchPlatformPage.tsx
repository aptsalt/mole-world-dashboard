"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Loader2, Sparkles, Search, Zap, Pen } from "lucide-react";
import { clsx } from "clsx";
import ResearchItemCard from "./ResearchItemCard";
import TweetComposer from "./TweetComposer";
import type { ResearchItem, ResearchFeed, ResearchPlatform } from "./research-types";
import {
  getResearchFeed,
  refreshResearchFeed,
  createContentFromResearch,
} from "@/lib/api";

type SortMode = "relevance" | "virality" | "potential" | "recent";

interface CategoryTab {
  key: string;
  label: string;
}

interface ResearchPlatformPageProps {
  platform: ResearchPlatform;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  label: string;
  categories?: CategoryTab[];
}

export default function ResearchPlatformPage({
  platform,
  icon: Icon,
  iconColor,
  label,
  categories,
}: ResearchPlatformPageProps) {
  const [feed, setFeed] = useState<ResearchFeed | null>(null);
  const [category, setCategory] = useState(categories?.[0]?.key ?? "default");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tweetItem, setTweetItem] = useState<ResearchItem | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await getResearchFeed(platform, category);
      setFeed(data);
    } catch { /* ignore */ }
  }, [platform, category]);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 15_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const filteredItems = useMemo(() => {
    if (!feed?.items) return [];
    let items = feed.items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q) ||
          i.tags.some((t) => t.includes(q)),
      );
    }

    items = [...items].sort((a, b) => {
      switch (sortMode) {
        case "relevance": return b.relevanceScore - a.relevanceScore;
        case "virality": return b.viralityScore - a.viralityScore;
        case "potential": return b.contentPotentialScore - a.contentPotentialScore;
        case "recent": return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
        default: return 0;
      }
    });

    return items;
  }, [feed, searchQuery, sortMode]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshResearchFeed(platform, true, category);
      // Poll for results
      setTimeout(fetchFeed, 3000);
      setTimeout(fetchFeed, 8000);
      setTimeout(fetchFeed, 15000);
    } catch { /* ignore */ }
    setRefreshing(false);
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateContent() {
    if (selectedIds.size === 0) return;
    setCreating(true);
    try {
      const items = filteredItems
        .filter((i) => selectedIds.has(i.id))
        .map((i) => ({
          id: i.id,
          title: i.title,
          url: i.url,
          platform: i.platform,
          content: i.content,
          author: i.author,
        }));
      await createContentFromResearch(items);
      setSelectedIds(new Set());
      fetchFeed();
    } catch { /* ignore */ }
    setCreating(false);
  }

  function handleBulkTweet() {
    const first = filteredItems.find((i) => selectedIds.has(i.id));
    if (first) setTweetItem(first);
  }

  const lastFetchedAgo = feed?.lastFetchedAt
    ? `${Math.round((Date.now() - new Date(feed.lastFetchedAt).getTime()) / 60_000)}m ago`
    : "never";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center", `bg-${iconColor}/20`)}>
            <Icon size={16} className={iconColor} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{label}</h2>
            <p className="text-xs text-muted">
              {feed?.items.length ?? 0} items &middot; updated {lastFetchedAgo}
              {feed?.error && <span className="text-red-400 ml-2">{feed.error}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={clsx(refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Category sub-tabs */}
      {categories && categories.length > 1 && (
        <div className="flex gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                category === cat.key
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-white/[0.02] text-muted border-white/[0.10] hover:bg-white/[0.05]",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
        >
          <option value="relevance">Sort by Relevance</option>
          <option value="virality">Sort by Virality</option>
          <option value="potential">Sort by Content Potential</option>
          <option value="recent">Sort by Recent</option>
        </select>

        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white outline-none placeholder:text-muted w-52"
          />
        </div>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-lime/5 border border-lime/20">
          <span className="text-xs font-medium text-lime">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleBulkTweet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
            >
              <Pen size={12} /> Compose Tweet
            </button>
            <button
              onClick={handleCreateContent}
              disabled={creating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime text-btn-text text-xs font-bold hover:bg-lime/80 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              Create Content
            </button>
          </div>
        </div>
      )}

      {/* Items grid */}
      <div className="grid gap-2">
        {filteredItems.map((item, i) => (
          <ResearchItemCard
            key={item.id}
            item={item}
            index={i}
            selected={selectedIds.has(item.id)}
            onToggle={toggleItem}
            onTweet={setTweetItem}
            onCreateContent={(it) => {
              createContentFromResearch([{
                id: it.id,
                title: it.title,
                url: it.url,
                platform: it.platform,
                content: it.content,
                author: it.author,
              }]);
            }}
          />
        ))}
      </div>

      {filteredItems.length === 0 && feed && (
        <div className="rounded-xl border border-white/10 bg-bg-card/60 p-8 text-center">
          <Sparkles size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">
            {feed.items.length === 0
              ? "No items yet — click Refresh to scrape"
              : "No items match the current search"}
          </p>
        </div>
      )}

      {/* Tweet Composer slide-over */}
      {tweetItem && (
        <TweetComposer item={tweetItem} onClose={() => setTweetItem(null)} />
      )}
    </div>
  );
}
