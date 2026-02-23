import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const STATE_DIR = join(process.cwd(), "automation", "state");

async function readJSON(file: string) {
  try {
    const data = await readFile(join(STATE_DIR, file), "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function GET() {
  const [contentQueue, automationQueue, whatsappJobs] = await Promise.all([
    readJSON("content-queue.json"),
    readJSON("queue.json"),
    readJSON("whatsapp-jobs.json"),
  ]);

  const posts = Array.isArray(contentQueue) ? contentQueue : [];
  const queue = Array.isArray(automationQueue) ? automationQueue : automationQueue?.items ?? [];
  const jobs = Array.isArray(whatsappJobs) ? whatsappJobs : whatsappJobs?.jobs ?? [];

  // Platform stats
  const platformStats: Record<string, { posted: number; failed: number; pending: number }> = {
    x: { posted: 0, failed: 0, pending: 0 },
    instagram: { posted: 0, failed: 0, pending: 0 },
    youtube: { posted: 0, failed: 0, pending: 0 },
    tiktok: { posted: 0, failed: 0, pending: 0 },
  };
  for (const post of posts) {
    if (!post.platforms) continue;
    for (const [key, plat] of Object.entries(post.platforms) as [string, any][]) {
      if (!platformStats[key]) continue;
      if (plat.status === "posted") platformStats[key].posted++;
      else if (plat.status === "failed") platformStats[key].failed++;
      else if (plat.enabled) platformStats[key].pending++;
    }
  }

  // Model stats from automation queue
  const modelStats: Record<string, { completed: number; failed: number; avgQuality: number; qualityScores: number[] }> = {};
  for (const item of queue) {
    const model = item.imageModel || "unknown";
    if (!modelStats[model]) modelStats[model] = { completed: 0, failed: 0, avgQuality: 0, qualityScores: [] };
    if (item.status === "completed") {
      modelStats[model].completed++;
      if (item.imageQuality?.score) modelStats[model].qualityScores.push(item.imageQuality.score);
    } else if (item.status === "failed") {
      modelStats[model].failed++;
    }
  }
  for (const stats of Object.values(modelStats)) {
    stats.avgQuality = stats.qualityScores.length > 0
      ? Math.round((stats.qualityScores.reduce((a, b) => a + b, 0) / stats.qualityScores.length) * 10) / 10
      : 0;
  }

  // Voice stats from WhatsApp jobs
  const voiceStats: Record<string, number> = {};
  for (const job of jobs) {
    const voice = job.voiceKey || job.voice || "none";
    voiceStats[voice] = (voiceStats[voice] || 0) + 1;
  }

  // Posting timeline (posts per day)
  const timeline: Record<string, number> = {};
  for (const post of posts) {
    if (!post.platforms) continue;
    for (const plat of Object.values(post.platforms) as any[]) {
      if (plat.postedAt) {
        const day = plat.postedAt.slice(0, 10);
        timeline[day] = (timeline[day] || 0) + 1;
      }
    }
  }

  // Content type breakdown
  const typeStats: Record<string, number> = {};
  for (const job of jobs) {
    const type = job.type || "unknown";
    typeStats[type] = (typeStats[type] || 0) + 1;
  }

  // Generation stats
  const totalGenerated = queue.filter((i: any) => i.status === "completed").length;
  const totalFailed = queue.filter((i: any) => i.status === "failed").length;
  const totalPending = queue.filter((i: any) => i.status === "pending").length;

  // ── X Engagement Metrics ──────────────────────────────────────
  let engagementTotalLikes = 0;
  let engagementTotalRetweets = 0;
  let engagementTotalReplies = 0;
  let engagementTotalImpressions = 0;
  let engagementTotalPosts = 0;
  const engagementPosts: Array<{
    id: string;
    title: string;
    platform: string;
    postId: string | null;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    postedAt: string | null;
    postUrl: string | null;
  }> = [];

  for (const post of posts) {
    if (!post.platforms) continue;
    for (const [platform, status] of Object.entries(post.platforms) as [string, any][]) {
      if (status.status !== "posted") continue;

      const eng = status.engagement;
      const likes = eng?.likes ?? 0;
      const retweets = eng?.retweets ?? 0;
      const replies = eng?.replies ?? 0;
      const impressions = eng?.impressions ?? 0;

      // Count all posted items, even without engagement data
      if (eng) {
        engagementTotalLikes += likes;
        engagementTotalRetweets += retweets;
        engagementTotalReplies += replies;
        engagementTotalImpressions += impressions;
      }
      engagementTotalPosts++;

      engagementPosts.push({
        id: String(post.id ?? ""),
        title: String(post.storyTitle ?? post.caption ?? "").slice(0, 100),
        platform,
        postId: status.postId ?? null,
        likes,
        retweets,
        replies,
        impressions,
        postedAt: status.postedAt ?? null,
        postUrl: status.postUrl ?? null,
      });
    }
  }

  // Sort engagement posts by impressions descending, then likes
  engagementPosts.sort((a, b) => b.impressions - a.impressions || b.likes - a.likes);

  // ── Production Stats from WhatsApp jobs ──────────────────────
  const productionStats = { total: 0, completed: 0, failed: 0, images: 0, clips: 0, lessons: 0, films: 0 };
  productionStats.total = jobs.length;
  for (const j of jobs) {
    if (j.status === "completed") productionStats.completed++;
    if (j.status === "failed") productionStats.failed++;
    if (j.type === "image") productionStats.images++;
    if (j.type === "clip") productionStats.clips++;
    if (j.type === "lesson") productionStats.lessons++;
    if (j.type === "film") productionStats.films++;
  }

  return NextResponse.json({
    overview: {
      totalPosts: posts.length,
      totalGenerated,
      totalFailed,
      totalPending,
      totalJobs: jobs.length,
    },
    platformStats,
    modelStats,
    voiceStats,
    timeline,
    typeStats,
    engagement: {
      totalLikes: engagementTotalLikes,
      totalRetweets: engagementTotalRetweets,
      totalReplies: engagementTotalReplies,
      totalImpressions: engagementTotalImpressions,
      totalPosts: engagementTotalPosts,
      posts: engagementPosts.slice(0, 50),
    },
    production: productionStats,
  });
}
