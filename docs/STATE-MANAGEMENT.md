# State Management & File-Based IPC

## 1. File-Based IPC Pattern

All services communicate via JSON files in `automation/state/`. There is no database, no message queue, no Redis. Just JSON files on disk.

This approach is simple, debuggable, and portable. You can `cat` any state file to inspect the current state of the system at any time. Every service reads from and writes to these shared files, making the entire IPC layer transparent and trivially auditable.

**Trade-off**: concurrent write risk. When two processes read a file, modify it independently, and write back, one process can overwrite the other's changes. This is mitigated by `mergeBeforeSave()` (see Section 7).

---

## 2. State Files Reference

| File | Writer(s) | Reader(s) | Description |
|------|-----------|-----------|-------------|
| `whatsapp-jobs.json` | Bridge, Worker, Dashboard | Worker, Dashboard | WhatsApp job queue (all job types) |
| `claude-jobs.json` | Bridge | Claude Worker | Claude Code job queue |
| `news-digest.json` | News Curator | Bridge, Dashboard | Daily news digest with ranked stories |
| `content-queue.json` | Worker | Social Worker, Dashboard | Content posts ready for social media |
| `prompt-presets.json` | Dashboard | Dashboard | 83 curated prompt presets |
| `queue.json` | Dashboard, Automation | Dashboard, Automation | 89-shot film queue |
| `status.json` | Automation | Dashboard | Pipeline status |
| `events.json` | Worker | Dashboard (SSE) | Real-time events for SSE streaming |
| `templates.json` | Dashboard | Dashboard | Film templates |

---

## 3. WhatsApp Job State Machine

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    v                                          │
              ┌──────────┐                                     │
              │ pending   │──────────────────┐                  │
              └──────────┘                   │                  │
                    │                        │                  │
          ┌────────┼────────┐                │                  │
          v                 v                v                  │
  ┌───────────────┐ ┌───────────────┐ ┌───────────┐            │
  │building_prompt│ │building_content│ │delivering │            │
  └───────────────┘ └───────────────┘ └───────────┘            │
          │                 │                │                  │
          v                 v                v                  │
  ┌────────────────┐        │         ┌───────────┐            │
  │generating_image│<───────┘         │ completed │            │
  └────────────────┘                  └───────────┘            │
          │                                                    │
          v                                                    │
  ┌────────────────┐                                           │
  │generating_video│───────────────────────────────────────────┘
  └────────────────┘              (recovery: back to pending)
          │
          v
    ┌───────────┐
    │ delivering │
    └───────────┘
          │
          v
    ┌───────────┐
    │ completed  │
    └───────────┘

    Any state ──> failed ──> pending (retry)
```

### Valid Transitions (from job-types.ts)

| From | To |
|------|----|
| pending | building_prompt, building_content, delivering, failed |
| building_prompt | generating_image, delivering, failed |
| building_content | generating_image, failed, pending |
| generating_image | generating_video, delivering, completed, failed, pending |
| generating_video | delivering, completed, failed, pending, generating_image |
| delivering | completed, failed |
| completed | (terminal) |
| failed | pending (retry) |

### Job Statuses (8 total)

| Status | Description |
|--------|-------------|
| pending | Waiting to be processed |
| building_prompt | Ollama enhancing the prompt |
| building_content | Generating content (news articles, etc.) |
| generating_image | Higgsfield image generation in progress |
| generating_video | Higgsfield video generation in progress |
| delivering | Sending result via OpenClaw |
| completed | Successfully delivered |
| failed | Error occurred (can retry to pending) |

---

## 4. Narration Status Machine (6 statuses)

```
none --> script_ready --> generating_tts --> tts_ready --> composing --> composed
```

| Status | Description |
|--------|-------------|
| none | No narration work started (default) |
| script_ready | Script written, awaiting TTS |
| generating_tts | TTS audio generation in progress |
| tts_ready | Audio generated, awaiting compose |
| composing | Mixing audio + video via FFmpeg |
| composed | Final narrated video ready |

---

## 5. Priority System

### Priority Field

- Range: 0-100 (0 = normal, 100 = immediate)
- Higher priority jobs are processed first by `getNextPending()`
- Set via dashboard or WhatsApp (future)

### Priority Aging

- Jobs gain +1 priority per minute of waiting
- Cap: +20 (prevents starvation but limits queue-jumping)
- Ensures old low-priority jobs eventually get processed

### Scheduling

- `scheduledAt` field (ISO timestamp or null)
- If set, job is skipped by `getNextPending()` until the scheduled time arrives
- Null = process immediately

### getNextPending() Logic

1. Filter jobs where `status === "pending"`
2. Filter out jobs where `scheduledAt` is in the future
3. Sort by effective priority (base priority + aging bonus) descending
4. Return the highest-priority eligible job

---

## 6. Job Recovery

### recoverInterrupted()

Called once at worker startup. Scans all jobs in `whatsapp-jobs.json` and resets any job in a "generating" state back to `pending`:

- `building_prompt` --> `pending`
- `building_content` --> `pending`
- `generating_image` --> `pending`
- `generating_video` --> `pending`
- `delivering` --> `pending`

This prevents jobs from getting permanently stuck when the worker is restarted mid-processing.

### Film Crash Recovery

Film jobs track per-scene progress via `sceneVideoPaths`, `completedSceneIndices`, and `currentScene`. On restart, completed scenes are skipped and processing resumes from the last incomplete scene. This prevents re-generating expensive multi-scene films from scratch.

---

## 7. mergeBeforeSave() -- Race Condition Mitigation

### The Problem

Bridge and Worker both read/write `whatsapp-jobs.json`. If Worker reads the file, processes a job, and writes back, any new jobs added by Bridge during that time window are lost.

### The Solution

`mergeBeforeSave()` in `job-queue.ts`:

1. Worker re-reads the file from disk immediately before saving
2. Discovers any new jobs that Bridge added since the last read
3. Merges new jobs into the Worker's in-memory array
4. Saves the merged result

### Limitations

- New job additions are preserved (primary use case)
- Field-level updates on existing jobs during worker processing are NOT merged (worker's version wins)
- `updateStatus()` calls `mergeBeforeSave()` before every `save()`

---

## 8. Full Zod Schema Reference

### WhatsAppJob Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | string | auto-generated | `wa_{timestamp}_{random}` |
| type | enum | required | image, clip, chat, news-content, content-from-media, social-post, lesson, film |
| description | string | required | User's content description |
| enhancedPrompt | string/null | null | Ollama-enhanced image prompt |
| motionPrompt | string/null | null | Video motion description |
| endFramePrompt | string/null | null | End frame description |
| replyTo | string | required | Group JID or E.164 phone number |
| senderPhone | string | "" | Sender for rate limiting |
| status | enum | pending | Job status (8 values) |
| batchCount | number (1-4) | 1 | Number of images to generate |
| outputPaths | string[] | [] | Generated file paths |
| chatResponse | string/null | null | Ollama chat response |
| error | string/null | null | Error message |
| articleTitle | string/null | null | News article title |
| articleUrl | string/null | null | News article URL |
| articleSource | string/null | null | News source name |
| storyId | string/null | null | News story ID |
| caption | string/null | null | Social media caption |
| narrationScript | string/null | null | TTS narration text |
| sharedMediaPath | string/null | null | User-shared media path |
| postPlatforms | string[] | [] | Target social platforms |
| contentPostId | string/null | null | Content post reference |
| voiceKey | string/null | null | Voice for TTS |
| imageModelAlias | string/null | null | Image model alias (a-m) |
| videoModelAlias | string/null | null | Video model alias (a-c) |
| scheduledAt | string/null | null | ISO timestamp for scheduling |
| priority | number (0-100) | 0 | Processing priority |
| source | enum | whatsapp | whatsapp or dashboard |
| narrationMode | enum | auto | auto or manual |
| pipeline | enum | higgsfield | higgsfield, content, distribution, local_gpu |
| narrationStatus | enum | none | 6 narration statuses |
| narrationAudioPath | string/null | null | Generated narration WAV |
| narratedVideoPath | string/null | null | Final narrated video |
| shotPlans | array/null | null | Shot plans from lesson gen |
| audioSettings | object/null | null | Narration volume, fade in/out |
| bgmPresetKey | string/null | null | BGM preset key |
| bgmVolume | number/null | null | BGM volume (0.0-0.5) |
| filmTemplateKey | string/null | null | Film template key |
| cast | CastMember[]/null | null | Multi-voice cast |
| sceneCount | number/null | null | Film scene count (1-20) |
| filmOutline | FilmScene[]/null | null | Generated film outline |
| currentScene | number/null | null | Current scene being processed |
| totalScenes | number/null | null | Total scenes in film |
| sceneVideoPaths | string[] | [] | Completed scene video paths |
| completedSceneIndices | number[] | [] | Completed scene indices |
| createdAt | string | required | ISO timestamp |
| updatedAt | string | required | ISO timestamp |
| completedAt | string/null | null | Completion timestamp |
