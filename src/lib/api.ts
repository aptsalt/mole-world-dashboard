import type {
  PipelineStatus,
  RenderStats,
  Clip,
  ClipsResponse,
  Storyboard,
  LogsResponse,
  VoiceData,
} from './types';

// Static demo data — used as fallback on GitHub Pages or when Flask is down
import demoStatus from '../../data/demo-status.json';
import demoStats from '../../data/demo-stats.json';
import demoClips from '../../data/demo-clips.json';
import demoStoryboard from '../../data/demo-storyboard.json';
import demoLogs from '../../data/demo-logs.json';
import demoVoices from '../../data/demo-voices.json';

// GitHub Pages static build sets NEXT_PUBLIC_DEMO_MODE=true
// Localhost always tries live Flask API first, falls back to demo data
const DEMO_ONLY = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555';

function unwrap<T>(raw: Record<string, unknown>): T {
  return (raw.data ?? raw) as T;
}

async function fetchLive<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

async function fetchWithFallback<T>(
  endpoint: string,
  demoData: Record<string, unknown>,
  extractClips?: boolean,
): Promise<T> {
  if (DEMO_ONLY) return extractClips
    ? unwrap<T>({ clips: unwrap<ClipsResponse>(demoData).clips } as unknown as Record<string, unknown>)
    : unwrap<T>(demoData);
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
