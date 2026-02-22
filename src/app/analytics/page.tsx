"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Mic,
  Layers,
  RefreshCw,
  Activity,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SkeletonStatRow, SkeletonBlock } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getAnalytics } from "@/lib/api";

const MODEL_COLORS = ["#7dd3fc", "#a5b4fc", "#86efac", "#fcd34d", "#fca5a5", "#c4b5fd"];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text)",
  },
};

interface AnalyticsData {
  overview: {
    totalPosts: number;
    totalGenerated: number;
    totalFailed: number;
    totalPending: number;
    totalJobs: number;
  };
  platformStats: Record<string, { posted: number; failed: number; pending: number }>;
  modelStats: Record<string, { completed: number; failed: number; avgQuality: number }>;
  voiceStats: Record<string, number>;
  timeline: Record<string, number>;
  typeStats: Record<string, number>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await getAnalytics();
      setData(result);
    } catch {
      // Demo fallback
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton w-40 h-5" />
            <div className="skeleton w-64 h-3" />
          </div>
        </div>
        <SkeletonStatRow count={5} />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonBlock className="h-[300px] rounded-xl" />
          <SkeletonBlock className="h-[300px] rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SkeletonBlock className="h-[250px] rounded-xl" />
          <SkeletonBlock className="h-[250px] rounded-xl" />
          <SkeletonBlock className="h-[250px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader
          icon={BarChart3}
          title="Content Analytics"
          subtitle="Performance insights across your content pipeline"
        />
        <EmptyState
          icon={BarChart3}
          title="No Analytics Data"
          description="Start generating and posting content to see performance analytics here."
        />
      </div>
    );
  }

  const { overview, platformStats, modelStats, voiceStats, timeline, typeStats } = data;

  // Transform data for charts
  const platformChartData = Object.entries(platformStats).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    posted: val.posted,
    failed: val.failed,
    pending: val.pending,
  }));

  const modelChartData = Object.entries(modelStats).map(([key, val]) => ({
    name: key,
    completed: val.completed,
    failed: val.failed,
    quality: val.avgQuality,
  }));

  const voiceChartData = Object.entries(voiceStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, val]) => ({
      name: key.replace(/_/g, " "),
      value: val,
    }));

  const timelineData = Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: date.slice(5), // MM-DD format
      posts: count,
    }));

  const typeChartData = Object.entries(typeStats).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        icon={BarChart3}
        title="Content Analytics"
        subtitle="Performance insights across your content pipeline"
        actions={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-all"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard label="Total Posts" value={overview.totalPosts} icon={Layers} color="var(--cyan)" />
        <StatCard label="Generated" value={overview.totalGenerated} icon={TrendingUp} color="#22c55e" />
        <StatCard label="Failed" value={overview.totalFailed} icon={Activity} color="#ef4444" />
        <StatCard label="Pending" value={overview.totalPending} icon={Activity} color="#f59e0b" />
        <StatCard label="Total Jobs" value={overview.totalJobs} icon={BarChart3} color="var(--accent)" />
      </div>

      {/* Platform + Model Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Platform Breakdown */}
        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-text mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-cyan" />
            Platform Distribution
          </h3>
          {platformChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformChartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="posted" fill="#22c55e" radius={[4, 4, 0, 0]} name="Posted" />
                <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
                <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted py-12 text-center">No platform data yet</p>
          )}
        </div>

        {/* Model Quality Comparison */}
        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-text mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-lime" />
            Model Performance
          </h3>
          {modelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelChartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="completed" fill="var(--cyan)" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="quality" fill="var(--lime)" radius={[4, 4, 0, 0]} name="Avg Quality" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted py-12 text-center">No model data yet</p>
          )}
        </div>
      </div>

      {/* Voice + Timeline + Type Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Voices */}
        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-text mb-3 flex items-center gap-2">
            <Mic size={14} className="text-accent" />
            Top Voices
          </h3>
          {voiceChartData.length > 0 ? (
            <div className="space-y-1.5">
              {voiceChartData.map((v, i) => {
                const maxVal = voiceChartData[0]?.value || 1;
                const pct = (v.value / maxVal) * 100;
                return (
                  <div key={v.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted w-24 truncate">{v.name}</span>
                    <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${pct}%`,
                          background: MODEL_COLORS[i % MODEL_COLORS.length],
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted w-6 text-right">{v.value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted py-12 text-center">No voice data yet</p>
          )}
        </div>

        {/* Posting Timeline */}
        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-text mb-3 flex items-center gap-2">
            <Activity size={14} className="text-success" />
            Posting Timeline
          </h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timelineData}>
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="posts" stroke="var(--cyan)" strokeWidth={2} dot={{ fill: "var(--cyan)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted py-12 text-center">No timeline data yet</p>
          )}
        </div>

        {/* Content Type Breakdown */}
        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-text mb-3 flex items-center gap-2">
            <PieChartIcon size={14} className="text-warning" />
            Content Types
          </h3>
          {typeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {typeChartData.map((_, i) => (
                    <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted py-12 text-center">No content type data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
