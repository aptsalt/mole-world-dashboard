import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve(process.cwd(), "automation", "output");
const BY_MODEL_DIR = path.join(OUTPUT_DIR, "by-model");

const MODEL_SUFFIXES: Record<string, string> = {
  hailuo: "Hailuo 2.3",
  kling25: "Kling 2.5 Turbo",
  seed15: "Seedance 1.5 Pro",
};

const SCENE_NAMES: Record<string, string> = {
  P1_S01: "Underground World Revealed",
  P1_S02: "Anaya's Morning",
  P1_S03: "Deep Tunnels Work Detail",
  P1_S04: "Data Stream Center",
  P1_S05: "Selection Hall Assembly",
  P1_S06: "Corridor Awakening",
  P1_S07: "Lower Level Meeting",
  P1_S08: "Transit System",
  P1_S09: "Communal Food Hall",
  P1_S10: "Surveillance Ops Center",
  P1_S11: "Night Cycle Pod",
  P1_S12: "Deep's Architect Station",
  P1_S13: "Montage",
  P1_S14: "Three Lights Flickering",
};

export interface VideoEntry {
  shotId: string;
  sceneId: string;
  sceneName: string;
  modelSuffix: string;
  modelName: string;
  fileName: string;
  sizeBytes: number;
  sizeKb: number;
  videoUrl: string;
  heroUrl: string | null;
  createdAt: string;
}

export interface VideoStats {
  totalVideos: number;
  totalShots: number;
  shotsWithImages: number;
  byModel: Record<string, number>;
  byScene: Record<string, number>;
  totalSizeBytes: number;
}

function findHeroImage(shotId: string, sceneId: string): string | null {
  // Check scene output dir first
  const sceneDir = path.join(OUTPUT_DIR, sceneId);
  if (fs.existsSync(sceneDir)) {
    const files = fs.readdirSync(sceneDir);
    const hero = files.find((f) => f.startsWith(shotId) && f.includes("hero") && f.endsWith(".png"));
    if (hero) return `/api/media/automation/${sceneId}/${hero}`;
  }

  // Check by-model dirs for any image
  if (fs.existsSync(BY_MODEL_DIR)) {
    for (const model of fs.readdirSync(BY_MODEL_DIR)) {
      const modelDir = path.join(BY_MODEL_DIR, model);
      if (!fs.statSync(modelDir).isDirectory()) continue;
      const files = fs.readdirSync(modelDir);
      const img = files.find((f) => f.startsWith(shotId) && f.endsWith(".png"));
      if (img) return `/api/media/automation/by-model/${model}/${img}`;
    }
  }
  return null;
}

function countShotsWithImages(): number {
  const shots = new Set<string>();
  if (!fs.existsSync(BY_MODEL_DIR)) return 0;
  for (const model of fs.readdirSync(BY_MODEL_DIR)) {
    const modelDir = path.join(BY_MODEL_DIR, model);
    if (!fs.statSync(modelDir).isDirectory()) continue;
    for (const file of fs.readdirSync(modelDir)) {
      if (!file.endsWith(".png")) continue;
      const match = file.match(/^(P\d+_S\d+_\d+)/);
      if (match) shots.add(match[1]);
    }
  }
  return shots.size;
}

export async function GET(): Promise<NextResponse> {
  const videos: VideoEntry[] = [];
  const stats: VideoStats = {
    totalVideos: 0,
    totalShots: 89,
    shotsWithImages: countShotsWithImages(),
    byModel: {},
    byScene: {},
    totalSizeBytes: 0,
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    return NextResponse.json({ videos, stats });
  }

  const sceneDirs = fs.readdirSync(OUTPUT_DIR).filter((d) => {
    const full = path.join(OUTPUT_DIR, d);
    return fs.statSync(full).isDirectory() && d.match(/^P\d+_S\d+$/);
  });

  for (const sceneId of sceneDirs) {
    const sceneDir = path.join(OUTPUT_DIR, sceneId);
    const files = fs.readdirSync(sceneDir).filter((f) => f.endsWith(".mp4"));

    for (const file of files) {
      const filePath = path.join(sceneDir, file);
      const fileStat = fs.statSync(filePath);

      // Skip screenshot fallbacks (< 100KB)
      if (fileStat.size < 100_000) continue;

      const shotMatch = file.match(/^(P\d+_S\d+_\d+)_(\w+)\.mp4$/);
      if (!shotMatch) continue;

      const shotId = shotMatch[1];
      const modelSuffix = shotMatch[2];
      const modelName = MODEL_SUFFIXES[modelSuffix];
      if (!modelName) continue; // skip unknown models (wan25, sora2 from old runs)

      const sceneName = SCENE_NAMES[sceneId] ?? sceneId;
      const heroUrl = findHeroImage(shotId, sceneId);

      videos.push({
        shotId,
        sceneId,
        sceneName,
        modelSuffix,
        modelName,
        fileName: file,
        sizeBytes: fileStat.size,
        sizeKb: Math.round(fileStat.size / 1024),
        videoUrl: `/api/media/automation/${sceneId}/${file}`,
        heroUrl,
        createdAt: fileStat.mtime.toISOString(),
      });

      stats.totalVideos++;
      stats.byModel[modelName] = (stats.byModel[modelName] ?? 0) + 1;
      stats.byScene[sceneId] = (stats.byScene[sceneId] ?? 0) + 1;
      stats.totalSizeBytes += fileStat.size;
    }
  }

  // Sort by scene/shot then model
  videos.sort((a, b) => {
    const shotCmp = a.shotId.localeCompare(b.shotId);
    if (shotCmp !== 0) return shotCmp;
    return a.modelSuffix.localeCompare(b.modelSuffix);
  });

  return NextResponse.json({ videos, stats });
}
