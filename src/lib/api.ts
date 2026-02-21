import type {
  PipelineStatus,
  RenderStats,
  Clip,
  ClipsResponse,
  Storyboard,
  LogsResponse,
  VoiceData,
  AutomationServiceStatus,
  AutomationQueueItem,
  AutomationEvent,
} from './types';
import type { ResearchFeed, ResearchPlatform } from '@/components/research/research-types';

// Static demo data — used as fallback on GitHub Pages or when Flask is down
import demoStatus from '../../data/demo-status.json';
import demoStats from '../../data/demo-stats.json';
import demoClips from '../../data/demo-clips.json';
import demoStoryboard from '../../data/demo-storyboard.json';
import demoLogs from '../../data/demo-logs.json';
import demoVoices from '../../data/demo-voices.json';
import demoContentDigest from '../../data/demo-content-digest.json';
import demoContentQueue from '../../data/demo-content-queue.json';
import demoWhatsAppJobs from '../../data/demo-whatsapp-jobs.json';
import demoVideos from '../../data/demo-videos.json';
import demoQueueItems from '../../data/demo-queue.json';
import demoResearchX from '../../data/demo-research-x.json';
import demoResearchInstagram from '../../data/demo-research-instagram.json';
import demoResearchTikTok from '../../data/demo-research-tiktok.json';
import demoResearchYouTube from '../../data/demo-research-youtube.json';

// GitHub Pages static build sets NEXT_PUBLIC_DEMO_MODE=true
// Localhost proxies through Next.js API route → Flask (same-origin, no CORS)
const DEMO_ONLY = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Client-side timeout for all API fetches — prevents hanging when backend is down
const API_TIMEOUT_MS = 4000;

function unwrap<T>(raw: Record<string, unknown>): T {
  return (raw.data ?? raw) as T;
}

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
}

async function fetchLive<T>(endpoint: string): Promise<T> {
  // Use Next.js API proxy route — same origin, no CORS issues
  const res = await fetchWithTimeout(`/api/pipeline${endpoint}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

async function fetchWithFallback<T>(
  endpoint: string,
  demoData: Record<string, unknown>,
): Promise<T> {
  if (DEMO_ONLY) return unwrap<T>(demoData);
  try {
    return await fetchLive<T>(endpoint);
  } catch {
    // Flask not running — fall back to demo data
    return unwrap<T>(demoData);
  }
}

export async function getStatus(): Promise<PipelineStatus> {
  return fetchWithFallback<PipelineStatus>('/api/status', demoStatus);
}

export async function getStats(): Promise<RenderStats> {
  return fetchWithFallback<RenderStats>('/api/stats', demoStats);
}

export async function getClips(): Promise<Clip[]> {
  if (DEMO_ONLY) return unwrap<ClipsResponse>(demoClips).clips;
  try {
    const data = await fetchLive<ClipsResponse>('/api/clips');
    return data.clips;
  } catch {
    return unwrap<ClipsResponse>(demoClips).clips;
  }
}

export async function getStoryboard(): Promise<Storyboard> {
  return fetchWithFallback<Storyboard>('/api/storyboard', demoStoryboard);
}

export async function getLogs(): Promise<LogsResponse> {
  return fetchWithFallback<LogsResponse>('/api/logs', demoLogs);
}

export async function getVoices(): Promise<VoiceData> {
  return fetchWithFallback<VoiceData>('/api/voices', demoVoices);
}

// Video/audio always use Next.js API route (streams from local disk)
// Works on localhost; 404s on GitHub Pages (expected — no video there)
export function getVideoUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return `/api/media/${normalized}`;
}

export function getAudioUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return `/api/media/${normalized}`;
}

// Automation output — images/videos from Higgsfield pipeline
// Path format: /api/media/automation/{sceneId}/{shotId}_hero.png
export function getAutomationImageUrl(shotId: string): string {
  const sceneId = shotId.replace(/_\d+$/, "");
  return `/api/media/automation/${sceneId}/${shotId}_hero.png`;
}

export function getAutomationVideoUrl(shotId: string, model: string): string {
  const sceneId = shotId.replace(/_\d+$/, "");
  const suffix = model.replace(/[.-]/g, "").replace("25", "25").replace("wan25", "wan25");
  const modelSuffix = model === "wan-2.5" ? "wan25" : model === "seedance-1.5-pro" ? "seed15" : model === "sora-2-queue" ? "sora2" : model;
  return `/api/media/automation/${sceneId}/${shotId}_${modelSuffix}.mp4`;
}

// ── Automation API ─────────────────────────────────────────────

const DEMO_AUTOMATION_STATUS: AutomationServiceStatus = {
  state: "idle",
  currentShot: null,
  currentStep: null,
  queueStats: { total: 89, pending: 62, completed: 22, failed: 3, inProgress: 0, pausedForCredits: 2, skipped: 0 },
  ollamaConnected: false,
  browserConnected: false,
  startedAt: null,
  lastActivity: null,
  uptime: 0,
  errors: [],
};

const DEMO_AUTOMATION_EVENTS: AutomationEvent[] = [
  { id: "evt_1", type: "service_started", shotId: null, message: "Automation started", details: {}, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "evt_2", type: "shot_completed", shotId: "P1_S01_001", message: "Shot P1_S01_001 completed", details: { quality: 8 }, timestamp: new Date(Date.now() - 3500000).toISOString() },
  { id: "evt_3", type: "shot_completed", shotId: "P1_S01_002", message: "Shot P1_S01_002 completed", details: { quality: 7 }, timestamp: new Date(Date.now() - 3400000).toISOString() },
  { id: "evt_4", type: "image_retry", shotId: "P1_S02_001", message: "Image quality 4/10 — retrying", details: {}, timestamp: new Date(Date.now() - 3300000).toISOString() },
  { id: "evt_5", type: "shot_failed", shotId: "P1_S03_002", message: "Shot failed: timeout", details: {}, timestamp: new Date(Date.now() - 3200000).toISOString() },
];

export async function getAutomationStatus(): Promise<AutomationServiceStatus> {
  if (DEMO_ONLY) return DEMO_AUTOMATION_STATUS;
  try {
    const res = await fetchWithTimeout('/api/automation/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return DEMO_AUTOMATION_STATUS;
  }
}

export async function getAutomationQueue(): Promise<AutomationQueueItem[]> {
  if (DEMO_ONLY) return [];
  try {
    const res = await fetchWithTimeout('/api/automation/queue', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getAutomationEvents(): Promise<AutomationEvent[]> {
  if (DEMO_ONLY) return DEMO_AUTOMATION_EVENTS;
  try {
    const res = await fetchWithTimeout('/api/automation/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return data.events ?? DEMO_AUTOMATION_EVENTS;
  } catch {
    return DEMO_AUTOMATION_EVENTS;
  }
}

export async function automationQueueAction(shotId: string, action: 'retry' | 'skip'): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/automation/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shotId, action }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function approveCredits(shotId: string, approved: boolean): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/automation/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shotId, approved }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Content Pipeline API ──────────────────────────────────────

export async function getContentDigest() {
  if (DEMO_ONLY) return demoContentDigest as Record<string, unknown>;
  try {
    const res = await fetchWithTimeout('/api/content/digest', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return demoContentDigest as Record<string, unknown>;
  }
}

export async function getContentQueue() {
  if (DEMO_ONLY) return demoContentQueue as unknown[];
  try {
    const res = await fetchWithTimeout('/api/content/queue', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return demoContentQueue as unknown[];
  }
}

// ── Research / All Digests API ────────────────────────────────

export async function getAllDigests() {
  if (DEMO_ONLY) return { digests: demoContentDigest ? [demoContentDigest] : [] };
  try {
    const res = await fetchWithTimeout('/api/research/rss', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return { digests: demoContentDigest ? [demoContentDigest] : [] };
  }
}

// ── WhatsApp Pipeline API ─────────────────────────────────────

export async function getWhatsAppJobs() {
  if (DEMO_ONLY) return demoWhatsAppJobs as unknown[];
  try {
    const res = await fetchWithTimeout('/api/whatsapp/jobs', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return demoWhatsAppJobs as unknown[];
  }
}

// ── Videos API ────────────────────────────────────────────────

export async function getVideos() {
  if (DEMO_ONLY) return demoVideos as Record<string, unknown>;
  try {
    const res = await fetchWithTimeout('/api/videos', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    // Fall back to demo data if API returns empty results (no videos on disk)
    if (!data.videos || data.videos.length === 0) {
      return demoVideos as Record<string, unknown>;
    }
    return data;
  } catch {
    return demoVideos as Record<string, unknown>;
  }
}

// ── Orchestrate API ───────────────────────────────────────────

export async function getOrchestrateStatus() {
  try {
    const res = await fetchWithTimeout('/api/orchestrate/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return {
      pipelines: {
        local_gpu: { status: "idle", label: "Local GPU", activeJobs: 0 },
        higgsfield: { status: "idle", label: "Higgsfield", activeJobs: 0 },
        content: { status: "idle", label: "Content", activeJobs: 0 },
        distribution: { status: "idle", label: "Distribution", activeJobs: 0 },
      },
      services: { worker: false, bridge: false, ollama: false },
      jobStats: { total: 0, pending: 0, active: 0, completed: 0, failed: 0 },
    };
  }
}

export async function getOrchestrateModels() {
  try {
    const res = await fetchWithTimeout('/api/orchestrate/models', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return { image: [], video: [], defaults: { image: "a", video: "a" } };
  }
}

export async function getOrchestrateJobs(filters?: { status?: string; pipeline?: string; limit?: number }) {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.pipeline) params.set("pipeline", filters.pipeline);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const res = await fetchWithTimeout(`/api/orchestrate/jobs?${params}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function createOrchestrateJob(job: {
  type: string;
  description: string;
  pipeline?: string;
  priority?: number;
  scheduledAt?: string | null;
  narrationMode?: string;
  narrationScript?: string;
  voiceKey?: string;
  imageModelAlias?: string;
  videoModelAlias?: string;
}) {
  const res = await fetchWithTimeout('/api/orchestrate/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to create job');
  }
  return res.json();
}

export async function updateOrchestrateJob(id: string, updates: Record<string, unknown>) {
  const res = await fetchWithTimeout(`/api/orchestrate/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to update job');
  }
  return res.json();
}

export async function getPromptPresets() {
  try {
    const res = await fetchWithTimeout('/api/orchestrate/presets', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return { categories: [], presets: [] };
  }
}

export async function savePromptPreset(preset: { name: string; category: string; prompt: string; tags?: string[] }) {
  const res = await fetchWithTimeout('/api/orchestrate/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to save preset');
  }
  return res.json();
}

// ── Narration Studio API ──────────────────────────────────────
// NOTE: Uses raw fetch (not fetchWithTimeout) because TTS can take 300s+

export async function getNarrationJobs() {
  try {
    const res = await fetch('/api/narration/jobs', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function generateNarrationScript(jobId: string, topic: string, videoDurationSec: number) {
  const res = await fetch('/api/narration/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, topic, videoDurationSec }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to generate script');
  }
  return res.json() as Promise<{ script: string; wordCount: number; estimatedDurationSec: number }>;
}

export async function generateNarrationTts(jobId: string, script: string, voiceKey: string) {
  const res = await fetch('/api/narration/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, script, voiceKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to generate TTS');
  }
  return res.json() as Promise<{ audioUrl: string; durationMs: number; engine: string }>;
}

export async function saveNarrationScript(jobId: string, script: string) {
  const res = await fetch('/api/narration/script', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, script }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to save script');
  }
  return res.json() as Promise<{ script: string; wordCount: number; estimatedDurationSec: number }>;
}

export async function composeNarratedVideo(jobId: string, audioSettings?: { narrationVolume?: number; fadeIn?: number; fadeOut?: number }) {
  const res = await fetch('/api/narration/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, audioSettings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to compose video');
  }
  return res.json() as Promise<{ videoUrl: string }>;
}

// ── Queue API ─────────────────────────────────────────────────

export async function getQueueItems() {
  if (DEMO_ONLY) return demoQueueItems as unknown[];
  try {
    const res = await fetchWithTimeout('/api/automation/queue', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return demoQueueItems as unknown[];
  }
}

// ── Research Hub API ─────────────────────────────────────────

const DEMO_RESEARCH_FEEDS: Record<string, unknown> = {
  x: demoResearchX,
  instagram: demoResearchInstagram,
  tiktok: demoResearchTikTok,
  youtube: demoResearchYouTube,
};

export async function getResearchFeed(platform: ResearchPlatform, category = "default"): Promise<ResearchFeed> {
  const params = category !== "default" ? `?category=${category}` : "";
  if (DEMO_ONLY) return (DEMO_RESEARCH_FEEDS[platform] ?? { platform, category, items: [], lastFetchedAt: null, fetchDurationMs: 0, error: null }) as ResearchFeed;
  try {
    const res = await fetchWithTimeout(`/api/research/${platform}${params}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return (DEMO_RESEARCH_FEEDS[platform] ?? { platform, category, items: [], lastFetchedAt: null, fetchDurationMs: 0, error: null }) as ResearchFeed;
  }
}

export async function refreshResearchFeed(platform: ResearchPlatform, force = false, category = "default") {
  const params = new URLSearchParams();
  if (force) params.set("force", "true");
  if (category !== "default") params.set("category", category);
  const res = await fetchWithTimeout(`/api/research/${platform}?${params}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}

export async function createContentFromResearch(items: { id: string; title: string; url: string; platform: string; content: string; author: string }[]) {
  const res = await fetchWithTimeout('/api/research/create-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to create content');
  }
  return res.json();
}

export async function generateTweetDraft(item: { title: string; content: string; url: string; platform: string }) {
  const res = await fetchWithTimeout('/api/research/tweet-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to generate draft');
  }
  return res.json() as Promise<{ draft: string; charCount: number }>;
}

export async function postTweet(text: string, mediaPath?: string) {
  const res = await fetchWithTimeout('/api/research/tweet-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mediaPath }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to post tweet');
  }
  return res.json() as Promise<{ success: boolean; postUrl: string | null }>;
}
