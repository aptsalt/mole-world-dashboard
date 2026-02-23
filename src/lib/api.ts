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
  ContentDigest,
  ContentPost,
  WhatsAppJob,
  NarrationJob,
  OrchestrateJob,
  OrchestrateStatusResponse,
  OrchestrateModelsResponse,
  PromptPresetsResponse,
  VideosResponse,
} from './types';
import type { ResearchFeed, ResearchPlatform } from '@/components/research/research-types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

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

export async function getContentDigest(): Promise<ContentDigest> {
  if (DEMO_ONLY) return demoContentDigest as unknown as ContentDigest;
  try {
    const res = await fetchWithTimeout('/api/content/digest', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<ContentDigest>;
  } catch {
    return demoContentDigest as unknown as ContentDigest;
  }
}

export async function getContentQueue(): Promise<ContentPost[]> {
  if (DEMO_ONLY) return demoContentQueue as unknown as ContentPost[];
  try {
    const res = await fetchWithTimeout('/api/content/queue', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<ContentPost[]>;
  } catch {
    return demoContentQueue as unknown as ContentPost[];
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

export async function getWhatsAppJobs(): Promise<WhatsAppJob[]> {
  if (DEMO_ONLY) return demoWhatsAppJobs as unknown as WhatsAppJob[];
  try {
    const res = await fetchWithTimeout('/api/whatsapp/jobs', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<WhatsAppJob[]>;
  } catch {
    return demoWhatsAppJobs as unknown as WhatsAppJob[];
  }
}

// ── Videos API ────────────────────────────────────────────────

export async function getVideos(): Promise<VideosResponse> {
  if (DEMO_ONLY) return demoVideos as unknown as VideosResponse;
  try {
    const res = await fetchWithTimeout('/api/videos', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = (await res.json()) as VideosResponse;
    // Fall back to demo data if API returns empty results (no videos on disk)
    if (!data.videos || data.videos.length === 0) {
      return demoVideos as unknown as VideosResponse;
    }
    return data;
  } catch {
    return demoVideos as unknown as VideosResponse;
  }
}

// ── Orchestrate API ───────────────────────────────────────────

export async function getOrchestrateStatus(): Promise<OrchestrateStatusResponse> {
  try {
    const res = await fetchWithTimeout('/api/orchestrate/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<OrchestrateStatusResponse>;
  } catch {
    return {
      pipelines: {
        local_gpu: { status: "idle", label: "Local GPU", activeJobs: 0 },
        higgsfield: { status: "idle", label: "Higgsfield", activeJobs: 0 },
        content: { status: "idle", label: "Content", activeJobs: 0 },
        distribution: { status: "idle", label: "Distribution", activeJobs: 0 },
      },
      services: { worker: false, bridge: false, ollama: false, xApi: false, perplexity: false },
      jobStats: { total: 0, pending: 0, active: 0, completed: 0, failed: 0 },
    };
  }
}

export async function getOrchestrateModels(): Promise<OrchestrateModelsResponse> {
  try {
    const res = await fetchWithTimeout('/api/orchestrate/models', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<OrchestrateModelsResponse>;
  } catch {
    return { image: [], video: [], defaults: { image: "a", video: "a" } };
  }
}

export async function getOrchestrateJobs(filters?: { status?: string; pipeline?: string; limit?: number }): Promise<OrchestrateJob[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.pipeline) params.set("pipeline", filters.pipeline);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const res = await fetchWithTimeout(`/api/orchestrate/jobs?${params}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<OrchestrateJob[]>;
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
  bgmPresetKey?: string;
  bgmVolume?: number;
  cast?: Array<{ character: string; voice: string }>;
  sceneCount?: number;
  filmTemplateKey?: string;
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

export async function getPromptPresets(): Promise<PromptPresetsResponse> {
  try {
    const res = await fetchWithTimeout('/api/orchestrate/presets', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<PromptPresetsResponse>;
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

// ── Job History API ──────────────────────────────────────────

export interface ArchivedJob {
  id: string;
  type: string;
  description: string;
  status: string;
  senderPhone: string;
  priority: number;
  source: string;
  pipeline: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  archivedAt: string;
}

export interface JobHistoryResponse {
  jobs: ArchivedJob[];
  total: number;
  limit: number;
  offset: number;
}

export async function getJobHistory(filters?: { search?: string; type?: string; status?: string; limit?: number; offset?: number }): Promise<JobHistoryResponse> {
  try {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));
    const res = await fetchWithTimeout(`/api/orchestrate/history?${params}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<JobHistoryResponse>;
  } catch {
    return { jobs: [], total: 0, limit: 50, offset: 0 };
  }
}

// ── Narration Studio API ──────────────────────────────────────
// NOTE: Uses raw fetch (not fetchWithTimeout) because TTS can take 300s+

export async function getNarrationJobs(): Promise<NarrationJob[]> {
  try {
    const res = await fetch('/api/narration/jobs', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<NarrationJob[]>;
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

export async function generateNarrationTts(jobId: string, script: string, voiceKey: string, engine?: "f5tts" | "bark-openvoice") {
  const res = await fetch('/api/narration/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, script, voiceKey, engine }),
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

export async function composeNarratedVideo(
  jobId: string,
  audioSettings?: { narrationVolume?: number; fadeIn?: number; fadeOut?: number },
  bgm?: { trackKey: string; volume?: number } | null,
) {
  const res = await fetch('/api/narration/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, audioSettings, bgm }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to compose video');
  }
  return res.json() as Promise<{ videoUrl: string }>;
}

export async function updateNarrationMode(jobId: string, mode: "auto" | "manual", script?: string) {
  const res = await fetch('/api/narration/mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, narrationMode: mode, narrationScript: script }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to update narration mode');
  }
  return res.json() as Promise<{ ok: boolean }>;
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

// ── BGM Library API ───────────────────────────────────────────

export interface BgmTrack {
  key: string;
  name: string;
  category: string;
  mood: string[];
  source: string;
  durationHint: number;
  bpmHint: number;
  quality: string;
  license: string;
  hasTrack: boolean;
  downloadMeta?: { downloadedAt: string };
}

export interface BgmLibraryResponse {
  version: string;
  defaultTrack: string | null;
  defaultVolume: number;
  tracks: BgmTrack[];
}

export async function getBgmPresets(): Promise<BgmLibraryResponse> {
  try {
    const res = await fetchWithTimeout('/api/bgm', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<BgmLibraryResponse>;
  } catch {
    return { version: "1.0", defaultTrack: null, defaultVolume: 0.15, tracks: [] };
  }
}

export async function updateBgmQuality(key: string, quality: string) {
  const res = await fetchWithTimeout('/api/bgm', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, quality }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to update BGM quality');
  }
  return res.json() as Promise<{ ok: boolean }>;
}

export async function downloadBgmTrack(key: string) {
  const res = await fetch('/api/bgm/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to download BGM track');
  }
  return res.json() as Promise<{ ok: boolean; key: string; path: string }>;
}

// ── Analytics API ──────────────────────────────────────────────

export async function getAnalytics() {
  const res = await fetch("/api/analytics", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

// ── Templates API ─────────────────────────────────────────────

export async function getTemplates() {
  const res = await fetch("/api/templates", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function saveTemplate(template: Record<string, unknown>) {
  const res = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  return res.json();
}

export async function deleteTemplate(id: string) {
  return fetch("/api/templates", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function useTemplate(id: string) {
  const res = await fetch("/api/templates", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action: "use" }),
  });
  return res.json();
}

// ── Workers API ────────────────────────────────────────────────

export async function getWorkerStatus() {
  const res = await fetch("/api/workers", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function updateWorkerConfig(updates: Record<string, unknown>) {
  const res = await fetch("/api/workers", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

// ── Thumbnails ────────────────────────────────────────────────

export function getThumbnailUrl(mediaPath: string, size: "sm" | "md" | "lg" = "md") {
  const cleanPath = mediaPath.replace(/^\/api\/media\//, "").replace(/^\//, "");
  return `/api/thumbnails/${cleanPath}?size=${size}`;
}
