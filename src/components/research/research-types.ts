export type ResearchPlatform = "x" | "instagram" | "tiktok" | "youtube";
export type ContentStatus = "pending" | "selected" | "generating" | "ready" | "posted" | "failed";

export interface ResearchItem {
  id: string;
  platform: ResearchPlatform;
  title: string;
  url: string;
  author: string;
  thumbnailUrl: string | null;
  content: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  tags: string[];
  mediaUrls: string[];
  publishedAt: string | null;
  relevanceScore: number;
  viralityScore: number;
  contentPotentialScore: number;
  contentStatus: ContentStatus;
  contentJobId: string | null;
}

export interface ResearchFeed {
  platform: ResearchPlatform;
  category: string;
  items: ResearchItem[];
  lastFetchedAt: string | null;
  fetchDurationMs: number;
  error: string | null;
}
