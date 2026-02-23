# Higgis Pipeline — AI Content Generation via WhatsApp

> One message, one masterpiece. A solo-built, zero-budget system that turns WhatsApp messages into AI-generated images, videos, narrated lessons, and multi-scene films — powered by 13 free AI models, 70 cloned voices, and a single MacBook Air.

**[Live Demo](https://aptsalt.github.io/mole-world-dashboard/)** | **[Source](https://github.com/aptsalt/mole-world-dashboard)**

---

## Screenshots

| Dashboard (Cool Navy) | Research Hub | Distribution (Soft Charcoal) |
|:---:|:---:|:---:|
| ![Dashboard](screenshots/dashboard.png) | ![Research](screenshots/research-hub.png) | ![Distribution](screenshots/distribution.png) |

| Production (Warm Slate) | Voice Lab | Content Pipeline |
|:---:|:---:|:---:|
| ![Production](screenshots/production.png) | ![Voices](screenshots/voices.png) | ![Content](screenshots/content.png) |

| Clips Browser | Composition Editor | Settings |
|:---:|:---:|:---:|
| ![Clips](screenshots/clips.png) | ![Compose](screenshots/compose.png) | ![Settings](screenshots/settings.png) |

---

## What This Does

Users send a message like `molt clip a sunset over mountains` in a WhatsApp group. The system enhances the prompt with a local LLM, generates a photorealistic image on Higgsfield.ai, converts it to a 5-second video, optionally adds narration in Morgan Freeman's voice with background music, and delivers the result back to WhatsApp — all automatically, all free.

For longer content, `molt lesson Black holes explained` produces a 30-second narrated video with 6 AI-generated shots. `molt film -t documentary The Amazon Rainforest` produces a multi-scene film with dialogue, narration, and cinematic BGM.

---

## Architecture

```
WhatsApp ──→ OpenClaw Gateway (:18789)
                    │
                    ▼
              Bridge Service ──→ whatsapp-jobs.json ◄── Dashboard (:3003)
                                        │
                    ┌───────────────────┼──────────────────┐
                    ▼                   ▼                  ▼
              Pipeline Worker    Claude Worker     News Curator
                    │                   │                  │
         ┌─────────┼─────────┐         │                  │
         ▼         ▼         ▼         ▼                  ▼
    Higgsfield  Ollama    F5-TTS   Claude CLI        RSS Feeds
    (browser)  (:11434)  (Python)                    + Ollama
         │                   │         │                  │
         └───────┬───────────┘         │                  │
                 ▼                     ▼                  ▼
           FFmpeg Compose         Responses           Digest
                 │                     │                  │
                 └─────────────────────┴──────────────────┘
                                       │
                                       ▼
                              OpenClaw → WhatsApp
```

---

## The Film

**The Mole World** is a philosophical sci-fi animated short about a subterranean dystopia where every human is implanted and owned. When Anaya's implant glitches, she begins to see the world for what it really is.

- **Chapter 1:** 14 scenes, 89 shots, 25 sequential clips, 6 characters
- **Runtime:** ~11 minutes of generated footage
- **Every frame** is AI-generated — no stock footage, no manual animation

| Phase | Progress |
|---|---|
| V1 Standard | 25/25 (100%) |
| V2 Enhanced | 22/25 (88%) |
| Narration | 89/89 (100%) |
| Compositing | 25/25 (100%) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Dashboard | Next.js 16.1 (App Router + Turbopack), TypeScript 5.9 (strict), Tailwind CSS v4, Zustand, Recharts |
| AI Models | Higgsfield.ai (13 image + 4 video models, free unlimited) |
| Local LLM | Ollama — qwen3:14b (text), minicpm-v (vision) |
| TTS | F5-TTS + OpenVoice (Python, Apple Silicon MPS) — 70 cloned voices |
| Media | FFmpeg, whisper-cpp, yt-dlp |
| Infra | launchd (7 services), file-based IPC (JSON), OpenClaw (WhatsApp gateway) |

---

## Features

### 20 Purpose-Built Pages

| Page | Route | Description |
|---|---|---|
| **Dashboard** | `/` | 20+ widgets: progress rings, pipeline health, GPU stats, render heatmap, film timeline, shot map |
| **Clips** | `/clips` | 89-shot gallery with Grid/Mosaic/List views, V1/V2 comparison slider, cinema modal, mini player |
| **Videos** | `/videos` | Multi-model video tracker (Hailuo, Seedance, Kling) |
| **Compose** | `/compose` | Timeline editor with render presets, crossfade, narration toggle, title card |
| **Storyboard** | `/storyboard` | Full screenplay: 14 scenes, character profiles, expandable shot details |
| **Voice Lab** | `/voices` | 70 voice profiles, waveform previews, quality grading |
| **Narration** | `/narration` | TTS narration management, script editor, BGM picker |
| **Pitch** | `/pitch` | Development journey presentation |
| **Production** | `/production` | Automation control panel with CLI commands and activity feed |
| **Gallery** | `/gallery` | Video gallery browser |
| **Queue** | `/queue` | Shot queue editor with prompt editing and bulk ops |
| **WhatsApp** | `/whatsapp` | WhatsApp bot pipeline with job cards and media previews |
| **Content** | `/content` | News-to-social pipeline: AI curation, generation, scheduling |
| **Research Hub** | `/research` | Multi-platform research (X, Instagram, YouTube, TikTok, RSS) with content ranking |
| **Distribution** | `/distribution` | Social posting hub with calendar, queue, per-platform pages |
| **Orchestrate** | `/orchestrate` | Unified pipeline control with prompt library (83 presets) |
| **Analytics** | `/analytics` | Cross-pipeline analytics — platform distribution, model performance, voice usage |
| **Settings** | `/settings` | Theme selection (4 themes), refresh interval, API health checks |
| **Logs** | `/logs` | Pipeline log viewer with search and color-coded entries |

### Key Highlights

- **WCAG AA Contrast** — all text meets 4.5:1 minimum across all 4 themes
- **SSE Real-Time Updates** — Server-Sent Events for live pipeline status
- **V1/V2 Comparison Slider** — synchronized dual-video with CSS `clip-path: inset()`
- **Mini Player** — persistent bottom-bar with playlist navigation, built on Zustand
- **Command Palette** (`Ctrl+K`) — fuzzy search across pages and actions
- **Keyboard Shortcuts** (`?` to view) — full keyboard navigation
- **Floating Action Button** — radial menu with 8 quick actions
- **Screensaver** — starfield animation after idle timeout (theme-aware)
- **60+ Custom Animations** — shimmer bars, pulse indicators, glass breathing, staggered reveals

---

## Multi-Theme System

Four color themes with WCAG AA-compliant contrast ratios (~6:1 for muted text):

| Theme | Background | Accent | Muted Text Contrast |
|---|---|---|---|
| **Cool Navy** (default) | `#1f2435` | `#7dd3fc` | ~6.2:1 |
| **Warm Slate** | `#2b2d3e` | `#89b4fa` | ~5.8:1 |
| **Soft Charcoal** | `#2e3045` | `#c4b5fd` | ~5.8:1 |
| **Light Mode** | `#f8fafc` | `#0284c7` | ~7.0:1 |

Implemented via CSS custom properties with `[data-theme]` attribute overrides and a route-aware `ThemeProvider`. Zero hardcoded hex values in components.

---

## WhatsApp Commands

```bash
molt generate a cyberpunk city at night          # Image
molt clip a golden retriever on a beach          # Image + 5s video
molt lesson The Fall of Rome                     # 6-shot narrated lesson (30s)
molt film -t documentary The Amazon Rainforest   # Multi-scene film
molt clip -v david_attenborough -m b a reef      # Custom voice + model
molt What is quantum computing?                  # Ollama chat response
```

Flags: `-v <voice>`, `-m <model>`, `-b <bgm>`, `-s <scenes>`, `-t <template>`

---

## Getting Started

### Demo Mode (no backend needed)

```bash
git clone https://github.com/aptsalt/mole-world-dashboard.git
cd mole-world-dashboard
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003). The dashboard loads pre-captured production data from `data/demo-*.json` automatically.

### What's Included

This public repo contains the complete dashboard frontend. All API routes return demo data — no backend services required. Video playback and write operations (posting, generating) are disabled in demo mode.

The full production pipeline (video generation, TTS, browser automation, social posting) lives in the private repo.

---

## Project Structure

```
mole-world-dashboard/
├── data/                    # Demo JSON snapshots (16 files)
│   ├── demo-status.json     # Pipeline progress
│   ├── demo-stats.json      # Render metrics
│   ├── demo-clips.json      # 89 clips with metadata
│   ├── demo-storyboard.json # Screenplay (14 scenes, 89 shots)
│   ├── demo-voices.json     # Voice assignments & profiles
│   ├── demo-videos.json     # Multi-model video entries
│   ├── demo-queue.json      # Render queue items
│   ├── demo-content-*.json  # Content pipeline data
│   ├── demo-research-*.json # Research feeds (X, IG, YT, TikTok)
│   └── demo-whatsapp-*.json # WhatsApp job data
├── docs/                    # Technical documentation
├── screenshots/             # App screenshots
├── src/
│   ├── app/                 # 20+ page routes + 47 API routes
│   │   ├── globals.css      # Multi-theme system + 800+ lines animations
│   │   └── ...
│   ├── components/
│   │   ├── layout/          # AppShell, Sidebar, Topbar, ThemeProvider
│   │   ├── research/        # ResearchItemCard, PlatformPage, TweetComposer
│   │   ├── distribution/    # PostCard, Calendar, PlatformPage, Composer
│   │   ├── content/         # NewsCard, ContentEditor, PostQueueCard
│   │   └── ui/              # MiniPlayer, CommandPalette, FAB, Toast, etc.
│   └── lib/
│       ├── api.ts           # Dual-mode data fetching (demo/live)
│       ├── types.ts         # Full TypeScript interface system
│       ├── store.ts         # Zustand global state
│       └── utils.ts         # Formatting & color utilities
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Docs Index](./docs/README.md) | Documentation home with reading path |
| [Vision](./docs/VISION.md) | Product vision, values, design principles |
| [Architecture](./docs/ARCHITECTURE.md) | System diagram, component map, data flows |
| [Dashboard](./docs/DASHBOARD.md) | 20+ pages, 47 API routes, UI features |
| [WhatsApp Commands](./docs/WHATSAPP-COMMANDS.md) | Complete command reference |
| [Pipelines](./docs/PIPELINES.md) | Image, video, lesson, film, news pipelines |
| [Models & Voices](./docs/MODELS-AND-VOICES.md) | 13 image models, 70 voices, 50 BGM tracks |
| [State Management](./docs/STATE-MANAGEMENT.md) | File-based IPC, job schemas, state machines |
| [Testing](./docs/TESTING.md) | Vitest framework, 75 tests, coverage gaps |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Dashboard pages | 20+ |
| API endpoints | 47 |
| AI models (free) | 13 image + 4 video |
| Voices | 70 (7 categories) |
| BGM tracks | 50 (10 categories) |
| Unit tests | 75 |
| Services | 7 (launchd) |
| Color themes | 4 (WCAG AA) |
| TypeScript | Strict, zero `any` |

---

## Built Entirely with Claude Code

This entire project — dashboard, automation pipeline, WhatsApp bridge, TTS engine, distribution system — was built by one person pair-programming with [Claude Code](https://claude.ai/code) (Anthropic's CLI coding agent). Zero lines of hand-written code. Every file was authored, debugged, and iterated through Claude Code sessions.

### Usage Stats (Feb 5-22, 2026)

| Metric | Value |
|---|---|
| **Total sessions** | 216+ |
| **Total messages exchanged** | 200,000+ |
| **Tokens processed** | 3.76 billion |
| **API-equivalent cost** | ~$8,267 (on $200/mo Pro plan -- **41x leverage**) |
| **Tool invocations** | 10,000+ (file edits, bash commands, grep, web search) |
| **Longest single session** | 947 messages, ~13 hours, 182 MB of agent output |
| **Peak day** | Feb 21 -- 22,072 messages across 17 sessions |
| **Models used** | Claude Opus 4.6 (primary), Sonnet 4 (subagents) |

### How It Works

Every feature starts as a natural-language plan. Claude Code decomposes it into tasks, reads the codebase, writes the implementation, runs tests, debugs failures, and iterates -- all in one session. The human role: architecture decisions, product direction, live testing, and course-correcting when things break.

---

## Coding Agent Sessions

Raw Claude Code session transcripts from building this project. Each shows the full human <> agent conversation: architecture decisions, implementation, live debugging, and iteration.

### Session 1 -- Production House Pipeline
**Duration:** 5 hours | **Messages:** 594 | **Tool calls:** 541 | **Context resets:** 4

Built in one session: F5-TTS engine with Apple Silicon MPS acceleration, 70-voice celebrity library (Morgan Freeman, Irrfan Khan, David Attenborough, etc.), YouTube reference clip downloader, FFmpeg audio mixer, text overlay system, multi-segment lesson pipeline, model alias system for 15+ free AI models, WhatsApp bridge with typo-tolerant parsing, and a dashboard voice review UI.

### Session 2 -- WhatsApp Pipeline (Mac Mini 24/7)
**Duration:** 2.5 hours | **Messages:** 453 | **Tool calls:** 437 | **Context resets:** 3

Adapted a Windows Playwright automation pipeline to macOS, bridged it to WhatsApp via OpenClaw gateway, and configured it to run 24/7 on a Mac Mini.

### Session 3 -- Full Dashboard Build (Monster Session)
**Duration:** ~13 hours | **Messages:** 947 | **File size:** 182 MB

Built the complete production dashboard in a single session: 20 pages, V1/V2 comparison slider, film composer, real-time pipeline status, mini player, voice lab, storyboard viewer.

### Session 4 -- Higgsfield Automation Pipeline
**Duration:** ~4 hours | **Tool calls:** 7-phase autonomous build

End-to-end browser automation that controls Higgsfield.ai via Playwright + local Ollama LLM. Automates 89 shots from prompt generation to video download.

### Download Session Transcripts

| File | Size | Contents |
|---|---|---|
| [`mole-world-higgsfield-automation-session.zip`](sessions/mole-world-higgsfield-automation-session.zip) | 1.6 MB | Higgsfield pipeline build |
| [`mole-world-full-dashboard-session.zip`](sessions/mole-world-full-dashboard-session.zip) | 9.4 MB | Full dashboard build -- 20 pages, 13-hour session |
| [`yc_claude_sessions.zip`](sessions/yc_claude_sessions.zip) | 20 KB | Production House + WhatsApp Pipeline transcripts |

---

## Built By

**Deep Chand** -- Solo founder & engineer. The entire AI film production pipeline -- screenplay, video generation, voice synthesis, compositing, WhatsApp automation, and this dashboard -- designed, directed, and built by one person on consumer hardware with zero budget, pair-programming exclusively with Claude Code.

---

## License

MIT
