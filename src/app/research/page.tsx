"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutGrid,
  AtSign,
  Camera,
  Youtube,
  Music,
  Newspaper,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getResearchFeed, getContentQueue } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SkeletonStatRow, SkeletonGrid, SkeletonList, SkeletonLine } from "@/components/ui/skeleton";
import type { ResearchFeed, ResearchItem } from "@/components/research/research-types";

interface ContentPost {
  id: string;
  storyTitle: string;
  storySource: string;
  createdAt: string;
  platforms: Record<string, { enabled: boolean; status: string; postedAt: string | null; postUrl: string | null }>;
}

const PLATFORMS = [
  { key: "x" as const, label: "X / Twitter", icon: AtSign, color: "text-white", bgColor: "bg-white/10" },
  { key: "instagram" as const, label: "Instagram", icon: Camera, color: "text-pink-400", bgColor: "bg-pink-500/10" },
  { key: "youtube" as const, label: "YouTube", icon: Youtube, color: "text-red-400", bgColor: "bg-red-500/10" },
  { key: "tiktok" as const, label: "TikTok", icon: Music, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
];

export default function ResearchDashboard() {
  const [feeds, setFeeds] = useState<Record<string, ResearchFeed | null>>({});
  const [contentQueue, setContentQueue] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const feedPromises = PLATFORMS.map(async (p) => {
        try {
          return { key: p.key, feed: await getResearchFeed(p.key) };
        } catch {
          return { key: p.key, feed: null };
        }
      });

      const [results, queue] = await Promise.all([
        Promise.all(feedPromises),
        getContentQueue().catch(() => []),
      ]);

      const feedMap: Record<string, ResearchFeed | null> = {};
      for (const r of results) feedMap[r.key] = r.feed;
      setFeeds(feedMap);
      setContentQueue(Array.isArray(queue) ? queue as ContentPost[] : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Stats
  const totalItems = Object.values(feeds).reduce((sum, f) => sum + (f?.items.length ?? 0), 0);
  const totalSelected = Object.values(feeds).reduce(
    (sum, f) => sum + (f?.items.filter((i) => i.contentStatus !== "pending").length ?? 0), 0,
  );
  const contentGenerating = contentQueue.filter((p) =>
    Object.values(p.platforms).some((pl) => pl.status === "generating"),
  ).length;
  const contentPosted = contentQueue.filter((p) =>
    Object.values(p.platforms).some((pl) => pl.postedAt),
  ).length;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <SkeletonLine className="w-36 h-5" />
            <SkeletonLine className="w-64 h-3" />
          </div>
        </div>
        {/* Stats row */}
        <SkeletonStatRow count={4} />
        {/* Platform cards */}
        <div className="space-y-3">
          <SkeletonLine className="w-24 h-3" />
          <SkeletonGrid count={4} cols={2} />
        </div>
        {/* Content pipeline */}
        <div className="space-y-3">
          <SkeletonLine className="w-32 h-3" />
          <SkeletonList rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={TrendingUp}
        iconBg="bg-gradient-to-br from-cyan/20 to-lime/20"
        title="Research Hub"
        subtitle="Multi-platform content research & tweet generation"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Items Scraped", value: totalItems, icon: LayoutGrid, color: "text-cyan" },
          { label: "Selected", value: totalSelected, icon: CheckCircle2, color: "text-lime" },
          { label: "Generating", value: contentGenerating, icon: Loader2, color: "text-amber-400" },
          { label: "Posted", value: contentPosted, icon: Zap, color: "text-green-400" },
        ].map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            loading={loading}
          />
        ))}
      </div>

      {/* Platform Cards */}
      <section>
        <h2 className="text-sm font-semibold text-text/80 uppercase tracking-wider mb-3">
          Platforms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const feed = feeds[p.key];
            const itemCount = feed?.items.length ?? 0;
            const lastFetched = feed?.lastFetchedAt
              ? `${Math.round((Date.now() - new Date(feed.lastFetchedAt).getTime()) / 60_000)}m ago`
              : "never";
            const hasError = !!feed?.error;
            const topItems = feed?.items.slice(0, 3) ?? [];

            return (
              <Link
                key={p.key}
                href={`/research/${p.key}`}
                className="group rounded-xl border border-white/[0.08] bg-bg-card/60 p-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", p.bgColor)}>
                      <Icon size={16} className={p.color} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text">{p.label}</h3>
                      <p className="text-[10px] text-muted">
                        {itemCount} items &middot; {lastFetched}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                </div>

                {hasError && (
                  <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-red-500/10">
                    <AlertCircle size={10} className="text-red-400" />
                    <span className="text-[10px] text-red-400 truncate">{feed?.error}</span>
                  </div>
                )}

                {topItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {topItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                        <span className="text-xs text-white/50 truncate">{item.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/20">No items yet</p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Content Pipeline */}
      {contentQueue.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text/80 uppercase tracking-wider mb-3">
            Content Pipeline
          </h2>
          <div className="grid gap-2">
            {contentQueue.slice(0, 10).map((post) => {
              const platformEntries = Object.entries(post.platforms);
              const anyPosted = platformEntries.some(([, v]) => v.postedAt);

              return (
                <div
                  key={post.id}
                  className="rounded-xl border border-white/[0.08] bg-bg-card/40 p-3 flex items-center gap-3"
                >
                  <div className={clsx(
                    "w-2 h-2 rounded-full shrink-0",
                    anyPosted ? "bg-green-400" : "bg-amber-400",
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate">{post.storyTitle}</p>
                    <p className="text-[10px] text-muted">
                      {post.storySource} &middot; {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {platformEntries.map(([platform, info]) => (
                      <span
                        key={platform}
                        className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded-full",
                          info.postedAt
                            ? "bg-green-500/20 text-green-400"
                            : info.enabled
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-white/5 text-white/30",
                        )}
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section>
        <h2 className="text-sm font-semibold text-text/80 uppercase tracking-wider mb-3">
          Quick Access
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/research/news"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-bg-card/40 text-xs text-white/60 hover:border-white/20 hover:text-white transition-all"
          >
            <Newspaper size={14} className="text-lime" />
            RSS News Feed
          </Link>
          <Link
            href="/distribution"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-bg-card/40 text-xs text-white/60 hover:border-white/20 hover:text-white transition-all"
          >
            <Zap size={14} className="text-cyan" />
            Distribution Hub
          </Link>
        </div>
      </section>
    </div>
  );
}
