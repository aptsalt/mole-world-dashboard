# Dashboard -- Pages & API Reference

## 1. Pages (20+ Routes)

| Route | Page Name | Description |
|-------|-----------|-------------|
| `/` | Dashboard | 20+ widgets: progress rings, pipeline health, GPU stats, render heatmap, film timeline, shot map |
| `/clips` | Clips Browser | 89-shot gallery with Grid/Mosaic/List views, V1/V2 comparison slider, cinema modal, mini player |
| `/videos` | Video Tracker | Multi-model video tracker (Hailuo, Seedance, Kling) |
| `/compose` | Composition Editor | Timeline editor with render presets, crossfade, narration toggle, title card |
| `/storyboard` | Storyboard | Full screenplay: 14 scenes, character profiles, expandable shot details |
| `/voices` | Voice Lab | 70 voice grid, category/language filters, search, quality status, test voice button |
| `/narration` | Narration Studio | TTS narration management, script editor, BGM picker, compose, audio preview |
| `/pitch` | Pitch | Development journey presentation |
| `/production` | Production Control | Automation control panel with CLI commands and activity feed |
| `/gallery` | Gallery | Video gallery browser |
| `/queue` | Shot Queue | Shot queue editor with prompt editing and bulk operations |
| `/whatsapp` | WhatsApp Tracker | Job pipeline visualization, queue bar, job cards with media previews |
| `/content` | Content Pipeline | News-to-social: AI curation, generation, scheduling |
| `/research` | Research Hub | Multi-platform research (X, Instagram, YouTube, TikTok, RSS) with Ollama ranking |
| `/distribution` | Distribution Hub | Social posting with calendar, queue, per-platform pages |
| `/orchestrate` | Orchestrate | Unified pipeline command center: 4 pipelines, content composer, production queue, prompt library |
| `/analytics` | Analytics | Cross-pipeline analytics: platform distribution, model performance, voice usage, posting timeline |
| `/settings` | Settings | Theme selection (4 themes), refresh interval, API health checks, thumbnail cache |
| `/logs` | Log Viewer | Pipeline log viewer with search, color-coded entries |

---

## 2. API Routes (47 Endpoints)

### WhatsApp (`/api/whatsapp/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/whatsapp/jobs` | List all WhatsApp jobs |
| GET | `/api/whatsapp/media` | Serve job media files |
| GET | `/api/whatsapp/summary` | Job statistics summary |

### Orchestrate (`/api/orchestrate/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/orchestrate/status` | Pipeline health status (launchctl + Ollama ping) |
| GET | `/api/orchestrate/models` | Available AI models list |
| GET/POST | `/api/orchestrate/jobs` | List jobs / Create new job |
| PATCH | `/api/orchestrate/jobs/[id]` | Update job (priority, cancel, retry) |
| GET/POST | `/api/orchestrate/presets` | List/create prompt presets |
| GET | `/api/orchestrate/history` | Job history |

### Narration (`/api/narration/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/narration/jobs` | List narration-eligible jobs |
| POST | `/api/narration/script` | Generate/update narration script |
| POST | `/api/narration/mode` | Set narration mode (auto/manual) |
| POST | `/api/narration/tts` | Generate TTS audio |
| POST | `/api/narration/compose` | Compose narration + video + BGM |

### Content (`/api/content/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/content/digest` | Get current news digest |
| POST | `/api/content/digest/select` | Select stories for content gen |
| GET | `/api/content/queue` | List content queue |
| GET/PATCH | `/api/content/queue/[id]` | Get/update content post |
| POST | `/api/content/queue/[id]/post` | Post content to social media |
| GET | `/api/content/media` | Serve content media |

### Research (`/api/research/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/research/[platform]` | Get platform feed (x, instagram, youtube, tiktok) |
| GET | `/api/research/rss` | Get RSS feeds |
| GET | `/api/research/search` | Search across platforms |
| POST | `/api/research/tweet-draft` | Draft a tweet |
| POST | `/api/research/tweet-post` | Post a tweet |
| POST | `/api/research/create-content` | Create content from research |

### Automation (`/api/automation/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/automation/status` | Automation pipeline status |
| POST | `/api/automation/approve` | Approve automation action |
| GET | `/api/automation/media` | Serve automation media |
| GET | `/api/automation/queue` | Get automation queue |

### Voices (`/api/voices/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/voices` | List all 70 voices |
| POST | `/api/voices/generate` | Test voice TTS generation |

### BGM (`/api/bgm/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET/PATCH | `/api/bgm` | List BGM tracks / update quality |
| POST | `/api/bgm/download` | Trigger BGM track download |

### Queue (`/api/queue/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/queue` | List shot queue |
| POST | `/api/queue/parse-md` | Parse markdown into queue items |
| POST | `/api/queue/upload-frame` | Upload a frame image |

### Other

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/videos` | List video entries |
| GET | `/api/events/stream` | SSE endpoint for real-time updates |
| GET | `/api/pipeline/[...path]` | Proxy pipeline data |
| GET | `/api/compose/[...path]` | Proxy compose data |
| GET | `/api/templates` | Film templates |
| GET | `/api/workers` | Worker status |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/thumbnails/[...path]` | Serve/generate thumbnails |
| POST | `/api/thumbnails/clear` | Clear thumbnail cache |
| GET | `/api/media/[...path]` | Serve media files (voice samples, profiles, BGM) |

---

## 3. UI Features

### Themes

4 color themes with WCAG AA-compliant contrast (~6:1 for muted text):

| Theme | Background | Accent |
|-------|-----------|--------|
| Cool Navy (default) | #1f2435 | #7dd3fc |
| Warm Slate | #2b2d3e | #89b4fa |
| Soft Charcoal | #2e3045 | #c4b5fd |
| Light Mode | #f8fafc | #0284c7 |

Implemented via CSS custom properties with `[data-theme]` attribute. Zero hardcoded hex in components.

### Real-Time Updates (SSE)

- `/api/events/stream` -- Server-Sent Events endpoint
- Dashboard pages subscribe for live updates
- Events: job status changes, queue updates, narration progress, pipeline health

### Command Palette

- `Ctrl+K` / `Cmd+K` -- fuzzy search across pages and actions

### Keyboard Shortcuts

- `?` -- show shortcut reference
- Full keyboard navigation across all pages

### Floating Action Button (FAB)

- Radial menu with 8 quick actions

### Mini Player

- Persistent bottom bar across all pages
- Playlist navigation, click-to-seek
- Built on Zustand state

### Screensaver

- Starfield animation after idle timeout
- Theme-aware colors

### Other

- V1/V2 comparison slider -- synchronized dual-video with CSS `clip-path: inset()`
- Guided onboarding -- interactive walkthrough for first-time users
- 60+ custom animations -- shimmer bars, pulse indicators, glass breathing, staggered reveals

---

## 4. Component Architecture

### Layout

- `AppShell` -- main layout wrapper
- `Sidebar` -- navigation with collapsible sections
- `Topbar` -- search, theme toggle, notifications
- `ThemeProvider` -- route-aware theme management

### State Management

- Zustand store (`lib/store.ts`) -- global client state
- No server-side state -- all data fetched from API routes
- Auto-refresh every 5s on key pages (WhatsApp, Orchestrate)

### Data Fetching

- `lib/api.ts` -- dual-mode fetching
  - **Live mode**: fetches from API routes (connects to automation state files)
  - **Demo mode**: loads from `data/demo-*.json` files (no backend needed)

### Error Tracking

- Dashboard pages display API error states
- Toast notifications for user-facing errors
- Health check indicators on Orchestrate page
