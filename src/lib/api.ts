import type {
  PipelineStatus,
  RenderStats,
  Clip,
  ClipsResponse,
  Storyboard,
  LogsResponse,
  VoiceData,
} from './types';

import demoStatus from '../../data/demo-status.json';
import demoStats from '../../data/demo-stats.json';
import demoClips from '../../data/demo-clips.json';
import demoStoryboard from '../../data/demo-storyboard.json';
import demoLogs from '../../data/demo-logs.json';
import demoVoices from '../../data/demo-voices.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const isDemoMode = !API_URL;

function unwrap<T>(raw: Record<string, unknown>): T {
  return (raw.data ?? raw) as T;
}

async function fetchLive<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

export async function getStatus(): Promise<PipelineStatus> {
  if (isDemoMode) return unwrap<PipelineStatus>(demoStatus);
  return fetchLive<PipelineStatus>('/api/status');
}

export async function getStats(): Promise<RenderStats> {
  if (isDemoMode) return unwrap<RenderStats>(demoStats);
  return fetchLive<RenderStats>('/api/stats');
}

export async function getClips(): Promise<Clip[]> {
  if (isDemoMode) return unwrap<ClipsResponse>(demoClips).clips;
  const data = await fetchLive<ClipsResponse>('/api/clips');
  return data.clips;
}

export async function getStoryboard(): Promise<Storyboard> {
  if (isDemoMode) return unwrap<Storyboard>(demoStoryboard);
  return fetchLive<Storyboard>('/api/storyboard');
}

export async function getLogs(): Promise<LogsResponse> {
  if (isDemoMode) return unwrap<LogsResponse>(demoLogs);
  return fetchLive<LogsResponse>('/api/logs');
}

export async function getVoices(): Promise<VoiceData> {
  if (isDemoMode) return unwrap<VoiceData>(demoVoices);
  return fetchLive<VoiceData>('/api/voices');
}

export function getVideoUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (isDemoMode) return `/api/media/${normalized}`;
  return `${API_URL}/video/${normalized}`;
}

export function getAudioUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (isDemoMode) return `/api/media/${normalized}`;
  return `${API_URL}/audio/${normalized}`;
}
