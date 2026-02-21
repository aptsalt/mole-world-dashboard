// ── Pipeline Status ──────────────────────────────────────────────

export interface PhaseStatus {
  done: number;
  total: number;
  status: string;
}

export interface PipelineStatus {
  total_shots: number;
  v1_clips: number;
  v2_clips: number;
  audio_narrations: number;
  audio_voiced: number;
  composite_clips: number;
  composed_clips: number;
  likely_running: Record<string, boolean>;
  v1_progress_pct: number;
  audio_progress_pct: number;
  v1: PhaseStatus;
  v2: PhaseStatus;
  narration: PhaseStatus;
}

// ── Render Stats ────────────────────────────────────────────────

export interface PerClipRender {
  index: string;
  shot_id: string;
  render_seconds: number;
}

export interface RenderInfo {
  count: number;
  total_seconds: number;
  total_hours: number;
  avg_seconds: number;
  min_seconds: number;
  max_seconds: number;
  per_clip: PerClipRender[];
}

export interface FileSizeInfo {
  count: number;
  total_mb: number;
  avg_kb: number;
}

export interface CurrentlyRendering {
  shot_id: string;
  phase: string;
  queued_at: string;
}

export interface RenderStats {
  v1_renders: RenderInfo;
  v2_renders: RenderInfo;
  v1_file_sizes: FileSizeInfo;
  v2_file_sizes: FileSizeInfo;
  audio_file_sizes: FileSizeInfo;
  currently_rendering: CurrentlyRendering | null;
}

// ── Clips ───────────────────────────────────────────────────────

export interface ClipFile {
  path: string;
  relative_path: string;
  source: string;
  size_bytes: number;
  size_kb: number;
  filename: string;
}

export interface AudioFile {
  path: string;
  relative_path: string;
  directory: string;
  format: string;
  size_bytes: number;
}

export interface Clip {
  shot_id: string;
  scene_id: string;
  has_clip: boolean;
  has_audio: boolean;
  has_composite: boolean;
  clip?: ClipFile | null;
  audio?: AudioFile | null;
  v1_clip?: ClipFile | null;
}

export interface ClipsResponse {
  clips: Clip[];
  total: number;
  with_audio: number;
  with_clip: number;
  with_composite: number;
}

// ── Storyboard ──────────────────────────────────────────────────

export interface Film {
  title: string;
  genre: string;
  logline: string;
  tone: string;
  style_prompt_prefix: string;
  total_parts: number;
}

export interface Character {
  visual_prompt: string;
}

export interface Shot {
  shot_id: string;
  duration_sec: number;
  camera: string;
  action: string;
  characters_in_frame: string[];
  emotion: string;
}

export interface Scene {
  scene_id: string;
  location: string;
  time: string;
  mood: string;
  shots: Shot[];
}

export interface Part {
  part_number: number;
  title?: string;
  description?: string;
  scenes: Scene[];
}

export interface Storyboard {
  file: string;
  version?: string;
  film: Film;
  characters: Record<string, Character>;
  total_shots: number;
  parts: Part[];
}

// ── Logs ────────────────────────────────────────────────────────

export interface LogEntry {
  name: string;
  path: string;
  exists: boolean;
  size_bytes?: number;
  size_kb?: number;
  modified?: number;
  age_seconds?: number;
  likely_active?: boolean;
}

export interface LogsResponse {
  logs: LogEntry[];
  recent: string[];
}

// ── Voices ──────────────────────────────────────────────────────

export interface VoiceAssignment {
  shot_id: string;
  scene_id: string;
  voice_actor: string;
  characters: string[];
  has_audio: boolean;
}

export interface VoiceProfile {
  key: string;
  name: string;
  label: string;
  color: string;
  has_reference: boolean;
  reference_audio: string;
  shot_count: number;
}

export interface VoiceData {
  narrator_voice: string;
  voice_counts: Record<string, number>;
  assignments: VoiceAssignment[];
  profiles: VoiceProfile[];
  samples: string[];
}

// ── Automation Pipeline ────────────────────────────────────────

export type AutomationShotStatus =
  | "pending"
  | "generating_image"
  | "assessing_image"
  | "retrying_image"
  | "generating_video"
  | "assessing_video"
  | "retrying_video"
  | "downloading"
  | "completed"
  | "failed"
  | "paused_for_credits"
  | "skipped";

export type AutomationServiceState = "idle" | "running" | "paused" | "stopped" | "error";

export interface AutomationQualityAssessment {
  score: number;
  reasoning: string;
  timestamp: string;
  attempt: number;
}

export interface AutomationQueueItem {
  shotId: string;
  sceneId: string;
  partNumber: number;
  status: AutomationShotStatus;
  prompt: string;
  motionPrompt: string;
  imageModel: string;
  videoModel: string;
  requiresCredits: boolean;
  imageQuality: AutomationQualityAssessment | null;
  videoQuality: AutomationQualityAssessment | null;
  imageAttempts: number;
  videoAttempts: number;
  outputImagePath: string | null;
  outputVideoPath: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface AutomationQueueStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  inProgress: number;
  pausedForCredits: number;
  skipped: number;
}

export interface AutomationServiceStatus {
  state: AutomationServiceState;
  currentShot: string | null;
  currentStep: string | null;
  queueStats: AutomationQueueStats;
  ollamaConnected: boolean;
  browserConnected: boolean;
  startedAt: string | null;
  lastActivity: string | null;
  uptime: number;
  errors: string[];
}

export interface AutomationEvent {
  id: string;
  type: string;
  shotId: string | null;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// ── Queue Editor ────────────────────────────────────────────────

export interface CameraConfig {
  sensor: string;
  lens: string;
  focalLength: string;
  aperture: string;
  movement: string;
  genre: string;
}

export interface QueueEditorItem {
  shotId: string;
  sceneId: string;
  partNumber: number;
  status: AutomationShotStatus;
  prompt: string;
  motionPrompt: string;
  camera: CameraConfig;
  imageModel: string;
  videoModels: string[];
  videoModel: string;
  durationSec: number;
  startFramePath: string;
  endFramePath: string;
  requiresCredits: boolean;
  imageQuality: AutomationQualityAssessment | null;
  videoQuality: AutomationQualityAssessment | null;
  imageAttempts: number;
  videoAttempts: number;
  outputImagePath: string | null;
  outputVideoPath: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface ParsedMdShot {
  shotNumber: number;
  shotId: string;
  durationSec: number;
  imagePrompt: string;
  motionPrompt: string;
  camera: CameraConfig;
  models: string[];
  finalModel: string;
}

// ── API Wrapper ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  status: string;
  message: string;
}
