// Dashboard-side job factory — keep in sync with automation/src/whatsapp/job-types.ts
// This mirrors the Zod defaults from WhatsAppJobSchema for dashboard-created jobs

export interface DashboardJobInput {
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
  cast?: Array<{ character: string; voice: string }> | null;
  sceneCount?: number;
  filmTemplateKey?: string;
}

export function createDashboardJob(input: DashboardJobInput) {
  const now = new Date().toISOString();
  return {
    id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    description: input.description,
    enhancedPrompt: null,
    motionPrompt: null,
    endFramePrompt: null,
    replyTo: "",
    senderPhone: "",
    status: "pending",
    batchCount: 1,
    outputPaths: [],
    chatResponse: null,
    error: null,
    articleTitle: null,
    articleUrl: null,
    articleSource: null,
    storyId: null,
    caption: null,
    narrationScript: input.narrationScript ?? null,
    sharedMediaPath: null,
    postPlatforms: [],
    contentPostId: null,
    voiceKey: input.voiceKey ?? null,
    imageModelAlias: input.imageModelAlias ?? null,
    videoModelAlias: input.videoModelAlias ?? null,
    scheduledAt: input.scheduledAt ?? null,
    priority: input.priority ?? 0,
    source: "dashboard" as const,
    narrationMode: input.narrationMode ?? "auto",
    pipeline: input.pipeline ?? "higgsfield",
    narrationStatus: "none",
    narrationAudioPath: null,
    narratedVideoPath: null,
    shotPlans: null,
    audioSettings: null,
    bgmPresetKey: input.bgmPresetKey ?? null,
    bgmVolume: input.bgmVolume ?? null,
    filmTemplateKey: input.filmTemplateKey ?? null,
    cast: input.cast ?? null,
    sceneCount: input.sceneCount ?? null,
    filmOutline: null,
    currentScene: null,
    totalScenes: null,
    sceneVideoPaths: [],
    completedSceneIndices: [],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}
