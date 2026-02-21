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

// Static demo data — used as fallback on GitHub Pages or when Flask is down
import demoStatus from '../../data/demo-status.json';
import demoStats from '../../data/demo-stats.json';
import demoClips from '../../data/demo-clips.json';
import demoStoryboard from '../../data/demo-storyboard.json';
import demoLogs from '../../data/demo-logs.json';
import demoVoices from '../../data/demo-voices.json';

// GitHub Pages static build sets NEXT_PUBLIC_DEMO_MODE=true
// Localhost proxies through Next.js API route → Flask (same-origin, no CORS)
const DEMO_ONLY = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function unwrap<T>(raw: Record<string, unknown>): T {
  return (raw.data ?? raw) as T;
}

async function fetchLive<T>(endpoint: string): Promise<T> {
  // Use Next.js API proxy route — same origin, no CORS issues
  const res = await fetch(`/api/pipeline${endpoint}`, { cache: 'no-store' });
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
    const res = await fetch('/api/automation/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return DEMO_AUTOMATION_STATUS;
  }
}

export async function getAutomationQueue(): Promise<AutomationQueueItem[]> {
  if (DEMO_ONLY) return [];
  try {
    const res = await fetch('/api/automation/queue', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getAutomationEvents(): Promise<AutomationEvent[]> {
  if (DEMO_ONLY) return DEMO_AUTOMATION_EVENTS;
  try {
    const res = await fetch('/api/automation/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return data.events ?? DEMO_AUTOMATION_EVENTS;
  } catch {
    return DEMO_AUTOMATION_EVENTS;
  }
}

export async function automationQueueAction(shotId: string, action: 'retry' | 'skip'): Promise<boolean> {
  try {
    const res = await fetch('/api/automation/queue', {
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
    const res = await fetch('/api/automation/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shotId, approved }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
