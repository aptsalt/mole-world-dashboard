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
  });
}
