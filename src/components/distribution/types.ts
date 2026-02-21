// ── Distribution Shared Types & Constants ─────────────────────

export interface PlatformStatus {
  enabled: boolean;
  status: string;
  postedAt: string | null;
  postUrl: string | null;
}

export interface ContentPost {
  id: string;
  storyTitle: string;
  storySource: string;
  caption: string;
  imagePath: string;
  videoPath: string | null;
  platforms: Record<string, PlatformStatus>;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConfig {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  x: 280,
  instagram: 2200,
  tiktok: 4000,
  youtube: 5000,
};

export const PLATFORM_META: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  x: { label: "X", color: "text-white", bgColor: "bg-white/10", dotColor: "#ffffff" },
  instagram: { label: "Instagram", color: "text-pink-400", bgColor: "bg-pink-500/10", dotColor: "#f472b6" },
  youtube: { label: "YouTube", color: "text-red-400", bgColor: "bg-red-500/10", dotColor: "#f87171" },
  tiktok: { label: "TikTok", color: "text-cyan-400", bgColor: "bg-cyan-500/10", dotColor: "#22d3ee" },
};

export const PLATFORM_KEYS = ["x", "instagram", "youtube", "tiktok"] as const;

export const HASHTAG_PRESETS: { label: string; tags: string[] }[] = [
  { label: "AI Content", tags: ["#AI", "#MachineLearning", "#ArtificialIntelligence", "#Tech", "#Innovation"] },
  { label: "Tech News", tags: ["#TechNews", "#Technology", "#Breaking", "#Digital", "#Future"] },
  { label: "Entertainment", tags: ["#Content", "#Creative", "#Trending", "#Viral", "#MustWatch"] },
];

export const OPTIMAL_TIMES: Record<string, string[]> = {
  x: ["9:00 AM", "12:00 PM", "5:00 PM"],
  instagram: ["11:00 AM", "1:00 PM", "7:00 PM"],
  youtube: ["2:00 PM", "4:00 PM", "9:00 PM"],
  tiktok: ["7:00 AM", "10:00 AM", "7:00 PM"],
};

export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: "text-white/40", label: "Draft" },
  scheduled: { color: "text-amber-400", label: "Scheduled" },
  posted: { color: "text-green-400", label: "Posted" },
  failed: { color: "text-red-400", label: "Failed" },
  posting: { color: "text-lime", label: "Posting" },
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function getMediaUrl(path: string): string {
  return `/api/content/media?file=${path.split("/").pop()}`;
}
