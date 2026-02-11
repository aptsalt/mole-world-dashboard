import type {
  PipelineStatus,
  RenderStats,
  Clip,
  ClipsResponse,
  Storyboard,
  LogsResponse,
  VoiceData,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const isDemoMode = !API_URL;

async function fetchApi<T>(endpoint: string, demoFile: string): Promise<T> {
  if (isDemoMode) {
    const mod = await import(`../../data/${demoFile}`);
    const raw = mod.default ?? mod;
    return (raw.data ?? raw) as T;
  }

  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

export async function getStatus(): Promise<PipelineStatus> {
  return fetchApi<PipelineStatus>('/api/status', 'demo-status.json');
}

export async function getStats(): Promise<RenderStats> {
  return fetchApi<RenderStats>('/api/stats', 'demo-stats.json');
}

export async function getClips(): Promise<Clip[]> {
  const data = await fetchApi<ClipsResponse>('/api/clips', 'demo-clips.json');
  return data.clips;
}

export async function getStoryboard(): Promise<Storyboard> {
  return fetchApi<Storyboard>('/api/storyboard', 'demo-storyboard.json');
}

export async function getLogs(): Promise<LogsResponse> {
  return fetchApi<LogsResponse>('/api/logs', 'demo-logs.json');
}

export async function getVoices(): Promise<VoiceData> {
  return fetchApi<VoiceData>('/api/voices', 'demo-voices.json');
}

export function getVideoUrl(relativePath: string): string {
  if (isDemoMode) return `/demo-videos/${relativePath}`;
  return `${API_URL}/video/${relativePath}`;
}

export function getAudioUrl(relativePath: string): string {
  if (isDemoMode) return `/demo-audio/${relativePath}`;
  return `${API_URL}/audio/${relativePath}`;
}
