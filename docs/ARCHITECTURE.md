# Higgis Pipeline / Mole World -- Architecture

> Last updated: 2026-02-23

Monorepo at `mole-world-2/` containing a Next.js dashboard and a suite of Playwright-based
automation workers orchestrated through 7 launchd services. All services run on a single
macOS host and communicate via shared JSON files on disk.

---

## 1. High-Level System Diagram

```
  WhatsApp / Discord / Signal / iMessage
                  |
                  v
  +-------------------------------+
  |  OpenClaw Gateway (port 18789)|        RSS Feeds
  |  ai.openclaw.gateway          |            |
  +-------------------------------+            |
          |              ^                     |
    log tail         openclaw                  |
    (inbound)        message send              |
          |          (delivery)                |
          v              |                     v
  +-----------------+    |       +------------------------+
  |  Bridge Service |    |       |  News Curator Service  |
  |  ai.moleworld  |    |       |  ai.moleworld          |
  |  .bridge        |    |       |  .news-curator         |
  +-----------------+    |       +------------------------+
          |              |              |           |
          v              |         Ollama rank   WhatsApp
  state/whatsapp-jobs.json <----+      |        (digest)
  state/claude-jobs.json        |      v
          |                     |  state/news-digest.json
          |                     |  state/content-queue.json
          |                     |
  +-------+--------+--------+  |
  |                |         |  |
  v                v         v  |
+---------------+ +--------+ +-+-----------+   +-------------------+
| Pipeline      | | Claude | | Social      |   | Dashboard         |
| Worker        | | Worker | | Worker      |   | Next.js (port 3003)|
| ai.moleworld | | ai.mol | | ai.moleworld|   | src/app/           |
| .pipeline     | | eworld | | .social     |   +-------------------+
+---------------+ | .claude| +-------------+        |
  |   |   |       +--------+       |                |
  |   |   |           |            |         API routes read/write
  |   |   |      Claude CLI        |         state/*.json
  |   |   |           |            |                |
  v   v   v           v            v                v
+--+ +--+ +--+   Responses    X / Instagram   SSE to browser
|Hf| |Ol| |TTS|  to WhatsApp  TikTok / YT    (real-time updates)
+--+ +--+ +--+
 |    |    |
 |    |    +----> Narration audio (F5-TTS, Python venv)
 |    +---------> Enhanced prompts, scripts (qwen3:14b, localhost:11434)
 +--------------> Images + videos (Playwright browser automation)
         |
         v
    FFmpeg Compose (stitch, mix narration + BGM, overlay text)
         |
         v
    OpenClaw message send --> WhatsApp / Discord
```

### Service Summary

| Service                     | launchd label              | Purpose                                    |
|-----------------------------|----------------------------|--------------------------------------------|
| OpenClaw Gateway            | `ai.openclaw.gateway`      | Multi-channel messaging gateway (port 18789)|
| Bridge                      | `ai.moleworld.bridge`      | Tail OpenClaw log, parse commands, create jobs|
| Pipeline Worker             | `ai.moleworld.pipeline`    | Headless Playwright, generate + deliver content|
| Claude Worker               | `ai.moleworld.claude`      | Spawn `claude` CLI for WhatsApp queries    |
| News Curator                | `ai.moleworld.news-curator`| Daily RSS fetch, Ollama rank, WhatsApp digest|
| Social Worker               | `ai.moleworld.social`      | Post from content-queue to social platforms |
| Ollama                      | (standalone)               | Local LLM server, localhost:11434          |

---

## 2. Component Map

### 2.1 Dashboard (`src/app/`)

#### Pages (21)

| Route           | Purpose                                      |
|-----------------|----------------------------------------------|
| `/`             | Home / overview                              |
| `/clips`        | Clip browser and management                  |
| `/videos`       | Video library                                |
| `/compose`      | Multi-step content composer                  |
| `/storyboard`   | Visual storyboard editor                     |
| `/voices`       | Voice library (70 voices, 7 categories)      |
| `/narration`    | Narration studio with TTS + BGM              |
| `/pitch`        | Pitch deck / presentation view               |
| `/production`   | Production pipeline monitor                  |
| `/gallery`      | Image gallery                                |
| `/queue`        | Job queue manager                            |
| `/whatsapp`     | WhatsApp pipeline dashboard with queue bar   |
| `/content`      | Content queue and digest management          |
| `/research`     | Research tools (RSS, search, tweets)         |
| `/distribution` | Distribution channel management              |
| `/orchestrate`  | Unified command center for all 4 pipelines   |
| `/analytics`    | Analytics and metrics                        |
| `/settings`     | Application settings                         |
| `/logs`         | Service log viewer                           |

#### API Routes (47)

Organized by domain, all under `src/app/api/`:

```
api/
  whatsapp/
    jobs/route.ts            -- CRUD for whatsapp-jobs.json
    media/route.ts           -- Serve generated media files
    summary/route.ts         -- Job summary / stats
  orchestrate/
    status/route.ts          -- Health check (launchctl + Ollama ping)
    models/route.ts          -- Available model list
    jobs/route.ts            -- GET list + POST create
    jobs/[id]/route.ts       -- PATCH update (priority, cancel, retry)
    presets/route.ts         -- GET + POST prompt presets
    history/route.ts         -- Job history
  narration/
    jobs/route.ts            -- Narration job management
    script/route.ts          -- Script generation
    mode/route.ts            -- Narration mode (auto/manual)
    tts/route.ts             -- TTS generation trigger
    compose/route.ts         -- Audio composition (narration + BGM)
  content/
    digest/route.ts          -- News digest data
    digest/select/route.ts   -- User selection of digest items
    queue/route.ts           -- Content queue list
    queue/[id]/route.ts      -- Individual content item
    queue/[id]/post/route.ts -- Trigger social post
    media/route.ts           -- Content media files
  research/
    [platform]/route.ts      -- Platform-specific research
    rss/route.ts             -- RSS feed queries
    search/route.ts          -- Web search proxy
    tweet-draft/route.ts     -- Draft tweet content
    tweet-post/route.ts      -- Post tweet
    create-content/route.ts  -- Create content from research
  automation/
    status/route.ts          -- Automation service status
    approve/route.ts         -- Manual approval workflow
    media/route.ts           -- Automation media files
    queue/route.ts           -- Automation queue
  voices/
    route.ts                 -- Voice library list + quality update
    generate/route.ts        -- TTS test generation
  bgm/
    route.ts                 -- BGM library list + quality update
    download/route.ts        -- Trigger yt-dlp download
  queue/
    route.ts                 -- General queue operations
    parse-md/route.ts        -- Parse markdown prompts
    upload-frame/route.ts    -- Upload start/end frame images
  videos/
    route.ts                 -- Video file listing
  events/
    stream/route.ts          -- SSE endpoint for real-time updates
  pipeline/[...path]/route.ts   -- Proxy to pipeline internals
  compose/[...path]/route.ts    -- Proxy to compose internals
  templates/route.ts            -- Template CRUD
  workers/route.ts              -- Worker status
  analytics/route.ts            -- Analytics data
  thumbnails/[...path]/route.ts -- Thumbnail generation + serving
  thumbnails/clear/route.ts     -- Clear thumbnail cache
  media/[...path]/route.ts      -- Static media file server
```

#### Components (`src/components/`)

```
components/
  layout/
    app-shell.tsx        -- Root layout wrapper
    sidebar.tsx          -- Navigation sidebar
    topbar.tsx           -- Top navigation bar
    theme-provider.tsx   -- Dark/light theme context
    sse-provider.tsx     -- SSE connection context
  ui/
    mini-player.tsx      -- Floating media preview player
    command-palette.tsx  -- Cmd+K command palette
    fab.tsx              -- Floating action button
    toast.tsx            -- Toast notifications
    screensaver.tsx      -- Idle screensaver
    skeleton.tsx         -- Loading skeleton
    stat-card.tsx        -- Dashboard stat cards
    confirm-dialog.tsx   -- Confirmation modal
    filter-tabs.tsx      -- Tabbed filter controls
    page-header.tsx      -- Standardized page headers
    lazy-thumbnail.tsx   -- Lazy-loaded thumbnail
    video-preview.tsx    -- Video preview component
    clip-comparison.tsx  -- Side-by-side clip comparison
    tooltip.tsx          -- Tooltip wrapper
    empty-state.tsx      -- Empty state placeholder
    onboarding.tsx       -- First-run onboarding
    quick-notes.tsx      -- Quick notes widget
    confetti.tsx         -- Celebration animation
    keyboard-shortcuts.tsx -- Keyboard shortcut handler
    shortcuts-modal.tsx  -- Shortcuts reference modal
  content/             -- Content-specific components
  dashboard/           -- Dashboard widgets
  distribution/        -- Distribution channel components
  orchestrate/         -- Orchestrate page components
  production/          -- Production pipeline components
  queue/               -- Queue management components
  research/            -- Research tool components
```

#### Lib (`src/lib/`)

```
lib/
  api.ts              -- Dual-mode API client (demo data / live backend)
  types.ts            -- Shared TypeScript interfaces
  store.ts            -- Zustand global state store
  utils.ts            -- General utilities
  sse.ts              -- SSE client helper
  sse-broadcast.ts    -- SSE server-side broadcast
  use-sse.ts          -- React hook for SSE subscriptions
  thumbnails.ts       -- Thumbnail generation utilities
  error-tracker.ts    -- Client-side error tracking
  job-factory.ts      -- Job creation helpers
  run-tsx.ts          -- tsx runner integration
```

---

### 2.2 Automation (`automation/src/`)

#### Top-Level Workers

| File                  | Service              | Purpose                                          |
|-----------------------|----------------------|--------------------------------------------------|
| `whatsapp-bridge.ts`  | ai.moleworld.bridge  | Tails OpenClaw log, parses commands, creates jobs|
| `whatsapp-worker.ts`  | ai.moleworld.pipeline| Polls jobs, generates content, delivers results  |
| `claude-worker.ts`    | ai.moleworld.claude  | Polls claude-jobs.json, spawns `claude` CLI      |
| `news-curator.ts`     | ai.moleworld.news-curator | RSS fetch, Ollama rank, WhatsApp digest    |
| `social-worker.ts`    | ai.moleworld.social  | Posts from content-queue to social platforms      |
| `config.ts`           | --                   | Centralized CONFIG object for all modules        |

#### Module Breakdown

**browser/** -- Playwright browser automation for Higgsfield.ai

```
browser/
  browser-manager.ts       -- Browser lifecycle (launch, persistent profile, close)
  selectors.ts             -- Shared CSS/XPath selectors
  page-objects/
    base-page.ts           -- Common page interactions (login check, toast dismiss, etc.)
    nano-banana.ts         -- Nano Banana image generation page
    wan-video.ts           -- Wan 2.5 video generation page
    seedance.ts            -- Seedance video generation page
    cinema-studio.ts       -- Cinema Studio page
    popcorn.ts             -- Popcorn page
    library-page.ts        -- Higgsfield library/gallery
    login-page.ts          -- Clerk auth login flow
    sora-queue.ts          -- Sora queue page
```

**composition/** -- Multi-shot video composition pipeline

```
composition/
  shot-planner.ts          -- Ollama-driven shot planning (6 shots x 5s for lessons)
  film-planner.ts          -- Multi-scene film outline generation
  film-templates.ts        -- Pre-built film structure templates
  segment-generator.ts     -- Per-segment image + video generation
  video-stitcher.ts        -- FFmpeg concatenation + normalization
```

**tts/** -- Text-to-speech engine

```
tts/
  tts-engine.ts            -- F5-TTS + OpenVoice wrapper (Python subprocess)
  voice-library.ts         -- Voice lookup, fuzzy match, quality management
  reference-downloader.ts  -- yt-dlp voice reference audio downloads
```

**audio/** -- Audio and text processing

```
audio/
  audio-mixer.ts           -- FFmpeg narration + BGM mix, atempo adjustment
  text-overlay.ts          -- FFmpeg drawtext overlay on video
  dialogue-mixer.ts        -- Multi-speaker dialogue mixing
```

**bgm/** -- Background music library

```
bgm/
  bgm-library.ts           -- BGM preset lookup, fuzzy match, quality management
  bgm-downloader.ts        -- yt-dlp download + FFmpeg normalize to 44.1kHz MP3
```

**news/** -- News curation pipeline

```
news/
  news-types.ts            -- Type definitions for news items
  rss-fetcher.ts           -- Multi-source RSS feed fetcher
  news-ranker.ts           -- Ollama-based relevance ranking
  digest-store.ts          -- Read/write state/news-digest.json
  content-prompts.ts       -- Ollama prompt templates for content generation
  content-queue-store.ts   -- Read/write state/content-queue.json
```

**social/** -- Social media posting

```
social/
  social-types.ts          -- Shared types for social platforms
  x-auth.ts                -- X/Twitter OAuth
  x-poster.ts              -- X/Twitter post creation
  x-metrics.ts             -- X/Twitter engagement metrics
  instagram-poster.ts      -- Instagram posting
  tiktok-poster.ts         -- TikTok posting
  youtube-api.ts           -- YouTube Data API client
  youtube-poster.ts        -- YouTube upload
```

**ollama/** -- Local LLM integration

```
ollama/
  client.ts                -- HTTP client for Ollama (localhost:11434)
  prompts.ts               -- Prompt templates for enhancement, scoring, scripts
  vision.ts                -- minicpm-v vision model integration
```

**whatsapp/** -- WhatsApp-specific logic

```
whatsapp/
  job-types.ts             -- WhatsAppJob interface + status enum
  job-queue.ts             -- WhatsAppJobQueue class (poll, merge, atomic write)
  command-parser.ts        -- Parse molt commands + flags (-v, -m, -b)
  prompt-builder.ts        -- Build generation prompts from user input
  audio-translate.ts       -- whisper-cpp + Ollama Hindi-to-English translation
  rate-limiter.ts          -- Per-user rate limiting
  delivery.ts              -- OpenClaw message send wrapper
  health-monitor.ts        -- Service health checks
  claude-job-types.ts      -- Claude job interface
```

**perplexity/** -- Perplexity.ai browser automation

```
perplexity/
  perplexity-page.ts       -- Page object for perplexity.ai
  search.ts                -- High-level search with browser lifecycle
  cli.ts                   -- CLI entry point
```

**utils/** -- Shared utilities

```
utils/
  logger.ts                -- Structured logging
  retry.ts                 -- Retry with exponential backoff
  notifier.ts              -- System notifications
```

---

## 3. Data Flow Diagrams

### 3.1 WhatsApp to Content Flow

```
User sends: "molt clip -v morgan_freeman -m b a sunset over mountains"
                              |
                              v
+----------------------------------------------------------+
| 1. OpenClaw Gateway receives message, writes to log      |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 2. Bridge tails log                                      |
|    - Detects "molt clip" prefix                          |
|    - Extracts flags: -v morgan_freeman, -m b (seedream)  |
|      -m b resolves to image alias "seedream"             |
|      No video alias specified, defaults to kling-2.5-turbo|
|    - Remaining text: "a sunset over mountains"           |
|    - Creates job in state/whatsapp-jobs.json             |
|      { type: "clip", status: "pending", ... }            |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 3. Pipeline Worker polls whatsapp-jobs.json (every 5s)   |
|    - Picks next pending job by priority + scheduledAt    |
|    - Status: pending -> building_prompt                  |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 4. Ollama Prompt Enhancement (qwen3:14b)                 |
|    - Expands "a sunset over mountains" into detailed     |
|      image generation prompt                             |
|    - Status: building_prompt -> generating_image         |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 5. Higgsfield Image Generation (Nano Banana / Seedream)  |
|    - Nuclear storage clear (localStorage, sessionStorage,|
|      IndexedDB) + hard reload                            |
|    - Upload start frame (if provided)                    |
|    - Dismiss image preview modal                         |
|    - Set prompt, resolution, unlimited toggle            |
|    - Click Generate, wait ~44s                           |
|    - Intercept network response for new image URL        |
|    - Download image                                      |
|    - Status: generating_image -> generating_video        |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 6. Higgsfield Video Generation (Kling 2.5 Turbo)        |
|    - Nuclear storage clear + hard reload                 |
|    - Upload generated image as start frame               |
|    - Settings applied AFTER upload (720p, unlimited)     |
|    - Generate video, wait ~90s                           |
|    - Download video                                      |
|    - Status: generating_video -> delivering              |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 7. Delivery via OpenClaw                                 |
|    - openclaw message send -m "<media path>"             |
|      --channel whatsapp                                  |
|    - Status: delivering -> completed                     |
+----------------------------------------------------------+
```

### 3.2 News to Social Content Flow

```
+----------------------------------------------------------+
| 1. News Curator (daily 8 AM via launchd CalendarInterval)|
|    - Fetch RSS feeds from multiple sources               |
|    - Rank articles via Ollama (qwen3:14b)                |
|    - Send top headlines to WhatsApp as numbered list     |
|    - Save to state/news-digest.json (status: "sent")     |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 2. User replies with selection: "1,3,5" or "all"         |
|    - Bridge detects number selection when digest          |
|      status = "sent"                                     |
|    - Creates news-content jobs in whatsapp-jobs.json     |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 3. Worker processes news-content job                     |
|    - 4 Ollama prompts (hook, body, CTA, hashtags)        |
|    - Generate image on Higgsfield                        |
|    - Generate video on Higgsfield                        |
|    - Add to state/content-queue.json                     |
|    - Deliver preview to WhatsApp                         |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 4. Social Worker polls content-queue.json (every 60s)    |
|    - Posts to X / Instagram / TikTok / YouTube           |
|    - Updates queue item status                           |
+----------------------------------------------------------+
```

### 3.3 Lesson / Film Pipeline

```
+----------------------------------------------------------+
| 1. Shot Planning                                         |
|    Input: "The Fall of Rome" + voice: morgan_freeman     |
|    Ollama generates 6 shot descriptions (lesson mode)    |
|    Each shot forced to durationSec: 5 (total 30s)        |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 2. Per-Shot Generation Loop (6 iterations)               |
|    For each shot:                                        |
|      a. Enhance prompt via Ollama                        |
|      b. Generate image on Higgsfield (Nano Banana)       |
|      c. Generate video on Higgsfield (Kling 2.5 Turbo)   |
|      d. Skip narration audio (skipNarration: true)       |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 3. Video Stitching                                       |
|    FFmpeg concatenates 6 video segments                  |
|    silentInput: true strips any incidental audio (-an)   |
|    Output: single silent 30s video                       |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 4. Post-Video Narration Script                           |
|    generatePostVideoNarration() in shot-planner.ts       |
|    Ollama writes narration based on actual completed     |
|    shots and real video duration                         |
|    Target pacing: ~2.5 words/sec for natural speech      |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 5. TTS Generation (F5-TTS)                               |
|    Python venv: automation/tts-env/                      |
|    Voice: morgan_freeman reference audio                 |
|    ~77s generation on Apple Silicon MPS                  |
|    Output: narration WAV file                            |
+----------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------+
| 6. Final Composition (FFmpeg)                            |
|    addContinuousNarration() in audio-mixer.ts            |
|    - atempo adjustment for duration mismatch             |
|    - Fade-in 0.5s, fade-out 1.0s                        |
|    - Optional BGM track at configurable volume           |
|    - -c:v copy (no video re-encode)                      |
|    Output: final lesson video with narration + BGM       |
+----------------------------------------------------------+
```

### 3.4 Dashboard SSE (Real-Time Updates)

```
+-------------------+     GET /api/events/stream     +------------------+
|  Browser Client   | -----------------------------> |  Next.js Server  |
|  (React + Zustand)|                                |  (SSE endpoint)  |
+-------------------+     text/event-stream          +------------------+
         |                       |                           |
         |  <-- job:status       |    reads state/*.json     |
         |  <-- queue:update     |    on poll interval       |
         |  <-- narration:prog   |                           |
         |                       |                           |
         v                       v                           v
   Zustand store           SSE connection            state/events.json
   triggers re-render      kept alive                (event buffer)
```

- `src/lib/sse.ts` / `use-sse.ts` -- client-side SSE connection + React hook
- `src/lib/sse-broadcast.ts` -- server-side event broadcasting
- `src/components/layout/sse-provider.tsx` -- context provider wrapping the app
- Auto-refresh fallback: dashboard pages poll every 5s as backup

---

## 4. Inter-Process Communication

### 4.1 File-Based IPC

All services communicate exclusively via JSON files in `automation/state/`:

| File                    | Writers                  | Readers                          |
|-------------------------|--------------------------|----------------------------------|
| `whatsapp-jobs.json`    | Bridge, Worker, Dashboard| Worker, Dashboard                |
| `claude-jobs.json`      | Bridge                   | Claude Worker                    |
| `news-digest.json`      | News Curator, Bridge     | Worker, Dashboard                |
| `content-queue.json`    | Worker, Social Worker    | Social Worker, Dashboard         |
| `prompt-presets.json`   | Dashboard                | Dashboard, Worker                |
| `queue.json`            | Dashboard                | Dashboard, Worker                |
| `status.json`           | Workers                  | Dashboard                        |
| `events.json`           | Workers                  | Dashboard SSE endpoint           |
| `templates.json`        | Dashboard                | Dashboard                        |

### 4.2 Concurrency Control

**mergeBeforeSave()** -- The core concurrency mechanism in `job-queue.ts`:

```
1. Worker wants to update job status
2. Worker re-reads whatsapp-jobs.json from disk (fresh copy)
3. Merges any NEW jobs added by Bridge since last read
4. Applies worker's status update to the merged dataset
5. Writes to temp file, then atomic rename (POSIX rename is atomic)
```

This prevents the worker from overwriting new jobs that the bridge added between
the worker's last read and its current write. Field-level merges on existing jobs
(e.g., bridge updates a field while worker updates status) are not yet implemented.

**PID Lock Files:**

| Lock File              | Owner           | Purpose                           |
|------------------------|-----------------|-----------------------------------|
| `state/bridge.pid`     | Bridge          | Prevent duplicate bridge instances|
| `state/claude-worker.pid` | Claude Worker| Prevent duplicate claude workers  |
| `state/social-worker.pid` | Social Worker| Prevent duplicate social workers  |

### 4.3 Poll Intervals

| Service         | Interval | Target File              |
|-----------------|----------|--------------------------|
| Pipeline Worker | 5s       | whatsapp-jobs.json       |
| Claude Worker   | 5s       | claude-jobs.json         |
| Social Worker   | 60s      | content-queue.json       |
| Dashboard       | 5s       | Various (via API routes)  |

### 4.4 Job State Machine

```
                    +----------+
                    | pending  |<---------+
                    +----------+          |
                         |           recoverInterrupted()
                         v           (on worker startup)
                  +-----------------+     |
                  | building_prompt |-----+
                  +-----------------+     |
                         |                |
                         v                |
                 +------------------+     |
                 | generating_image |-----+
                 +------------------+     |
                         |                |
                         v                |
                 +------------------+     |
                 | generating_video |-----+
                 +------------------+     |
                         |                |
                         v                |
                   +------------+         |
                   | delivering |---------+
                   +------------+
                         |
              +----------+----------+
              |                     |
              v                     v
        +-----------+         +--------+
        | completed |         | failed |
        +-----------+         +--------+
```

`recoverInterrupted()` is called once at worker startup. It resets any jobs stuck
in intermediate states (`building_prompt`, `generating_image`, `generating_video`,
`delivering`) back to `pending`, preventing permanently stuck jobs after a crash or
restart.

---

## 5. External Dependencies

### 5.1 AI / Generation Services

| Dependency       | Type              | Access Method              | Purpose                            |
|------------------|-------------------|----------------------------|------------------------------------|
| Higgsfield.ai    | Cloud service     | Playwright browser automation| Image + video generation (free unlimited tier)|
| Ollama           | Local server      | HTTP (localhost:11434)     | qwen3:14b text, minicpm-v vision   |
| F5-TTS           | Local (Python)    | Subprocess via tts-env/    | Voice cloning TTS                  |
| OpenVoice        | Local (Python)    | Subprocess via tts-env/    | Voice conversion                   |
| Claude CLI       | Local binary      | Subprocess                 | LLM responses for WhatsApp queries |

### 5.2 Infrastructure

| Dependency       | Type              | Access Method              | Purpose                            |
|------------------|-------------------|----------------------------|------------------------------------|
| OpenClaw         | Local server      | CLI + port 18789           | Multi-channel messaging gateway    |
| FFmpeg           | Local binary      | Subprocess                 | Media processing, composition      |
| whisper-cpp      | Local binary      | Subprocess (`whisper-cli`) | Hindi audio transcription          |
| yt-dlp           | Local binary      | Subprocess                 | Voice reference + BGM downloads    |
| Playwright       | Node.js library   | In-process                 | Browser automation for Higgsfield  |

### 5.3 Browser Profiles

Two separate persistent Chromium profiles prevent session conflicts:

| Profile                          | Service         | Purpose                        |
|----------------------------------|-----------------|--------------------------------|
| `automation/browser-profile/`    | Pipeline Worker | Higgsfield.ai OAuth session    |
| `automation/perplexity-profile/` | Perplexity CLI  | Perplexity.ai session          |

### 5.4 Cloud Providers (via OpenClaw)

| Provider    | Models                    | Use Case                         |
|-------------|---------------------------|----------------------------------|
| Groq        | llama-3.3-70b-versatile   | AI news cron briefings           |
| Perplexity  | sonar, sonar-pro, sonar-reasoning-pro | Web search cron jobs   |

---

## 6. Directory Structure Summary

```
mole-world-2/
  src/
    app/                       -- Next.js 16.1 app directory
      api/                     -- 47 API route handlers
      (21 page directories)    -- Dashboard pages
      layout.tsx               -- Root layout
      page.tsx                 -- Home page
      globals.css              -- Global styles
    components/                -- React components
      layout/                  -- Shell, sidebar, topbar, providers
      ui/                      -- Reusable UI primitives (20 components)
      content/                 -- Content-specific components
      dashboard/               -- Dashboard widgets
      distribution/            -- Distribution components
      orchestrate/             -- Orchestrate page components
      production/              -- Production components
      queue/                   -- Queue components
      research/                -- Research components
    lib/                       -- Shared library code
  automation/
    src/                       -- TypeScript automation source
      browser/                 -- Playwright page objects
      composition/             -- Multi-shot video pipeline
      tts/                     -- F5-TTS engine + voice library
      audio/                   -- FFmpeg audio/text processing
      bgm/                     -- Background music library
      news/                    -- RSS + ranking + content prompts
      social/                  -- Platform posting modules
      ollama/                  -- Local LLM client
      whatsapp/                -- Job queue, parser, delivery
      perplexity/              -- Perplexity.ai automation
      utils/                   -- Logger, retry, notifier
    state/                     -- Shared JSON state files (IPC)
    browser-profile/           -- Persistent Chromium profile (Higgsfield)
    perplexity-profile/        -- Persistent Chromium profile (Perplexity)
    voice-library/             -- voices.json + reference audio
    bgm-library/               -- bgm-presets.json + tracks/
    tts-env/                   -- Python virtualenv (F5-TTS + OpenVoice)
    models/                    -- Whisper model files (ggml-large-v3.bin)
    output/                    -- Generated media output
  data/                        -- Static data files
  docs/                        -- Documentation
  public/                      -- Next.js public assets
  e2e/                         -- End-to-end tests (Playwright)
  scripts/                     -- Setup + utility scripts
  package.json                 -- ESM ("type": "module"), TypeScript strict
  tsconfig.json                -- TypeScript configuration
  next.config.ts               -- Next.js 16.1 configuration
  playwright.config.ts         -- Playwright test configuration
```

---

## 7. Key Design Decisions

### Why file-based IPC instead of a database or message queue?

1. **Simplicity** -- No external database to manage, back up, or recover
2. **Inspectability** -- Any state file can be read with `cat` or edited with a text editor
3. **Crash recovery** -- JSON files survive process crashes; `recoverInterrupted()` handles stuck states
4. **Atomic writes** -- POSIX `rename()` provides atomic file replacement

The trade-off is limited concurrency (single-writer-per-file is the practical constraint),
which is acceptable given the throughput requirements (one job at a time per worker).

### Why browser automation instead of APIs for Higgsfield?

Higgsfield.ai does not offer a public API. The free "unlimited" tier is only available
through the web interface. Playwright automates the browser with a persistent profile,
so OAuth sessions survive worker restarts.

### Why post-video narration instead of pre-video?

Narration scripts are generated AFTER video stitching so the script can reference the
actual completed visuals and match the real video duration. This avoids mismatches
between planned and actual shot timings. The F5-TTS output is then time-stretched
(via FFmpeg atempo) to match the video duration precisely.

### Why nuclear storage clear before each generation?

Higgsfield's web app uses IndexedDB, localStorage, and sessionStorage to cache
previously uploaded frames. Without clearing all storage before each generation,
stale cached frames from previous jobs leak into new generations. The nuclear
clear (all storage + hard reload) was the only reliable fix.
