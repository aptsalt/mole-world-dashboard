import { NextRequest, NextResponse } from "next/server";
import demoResearchX from "../../../../../data/demo-research-x.json";
import demoResearchInstagram from "../../../../../data/demo-research-instagram.json";
import demoResearchTikTok from "../../../../../data/demo-research-tiktok.json";
import demoResearchYouTube from "../../../../../data/demo-research-youtube.json";

const DEMO_FEEDS: Record<string, unknown> = {
  x: demoResearchX,
  instagram: demoResearchInstagram,
  tiktok: demoResearchTikTok,
  youtube: demoResearchYouTube,
};

const VALID_PLATFORMS = ["x", "instagram", "tiktok", "youtube"];

/**
 * Demo-only: returns research feeds from demo JSON files.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 });
  }

  const feed = DEMO_FEEDS[platform] ?? {
    platform,
    category: "default",
    items: [],
    lastFetchedAt: null,
    fetchDurationMs: 0,
    error: null,
  };

  return NextResponse.json(feed);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 });
  }

  return NextResponse.json(
    { error: "Research feed refresh is not available in demo mode. The automation backend with scrapers is required." },
    { status: 501 },
  );
}
