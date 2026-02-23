# Higgis Pipeline -- Vision & Constitution

> One message, one masterpiece.

This document defines the product vision, core values, design principles, and architectural philosophy of the Higgis Pipeline. It serves as a constitution -- a set of non-negotiable commitments that guide every decision, from code structure to content quality.

---

## 1. Product Vision

A WhatsApp message is the simplest interface on the planet. Nearly everyone already has it. No downloads, no signups, no learning curve.

Higgis Pipeline turns that single message into professional-quality AI-generated content -- images, videos, narrated lessons, and short films -- delivered back to the same chat within minutes.

**The promise:**

- Type `molt generate a cyberpunk city at sunset` and receive a scored, prompt-enhanced AI image.
- Type `molt clip a whale breaching in slow motion -v david_attenborough` and receive a narrated video with background music.
- Type `molt lesson The Fall of Rome -v morgan_freeman -b cinematic_epic_rising` and receive a 30-second multi-shot documentary with voice narration and cinematic score.
- Send a Hindi voice note and the system transcribes, translates, and generates content from it -- no English required.

**The constraint that makes it remarkable:**

A single MacBook Air runs the entire pipeline. Seven launchd services. Thirteen AI models. Seventy voices. Fifty BGM tracks. Zero API costs. Zero cloud bills. Zero team members.

This is not a prototype waiting for infrastructure. This is the infrastructure.

---

## 2. Core Values

### Autonomy

The system runs 24/7 without human intervention. All seven services are managed by launchd with automatic restart on crash. Job state recovery (`recoverInterrupted()`) resets stuck jobs on worker startup. Health monitoring tracks Ollama availability, browser session validity, and service uptime. The operator sleeps while the pipeline works.

### Accessibility

WhatsApp is the only interface a user ever touches. There are no accounts to create, no apps to install, no credits to purchase. Hindi audio messages are automatically transcribed via whisper-cpp and translated via Ollama before entering the generation pipeline. The technical complexity is entirely invisible to the end user.

### Quality

Every generated image is scored by an Ollama vision model (minicpm-v). Images scoring below 6 out of 10 are automatically regenerated, up to two retries. Prompts are enhanced by qwen3:14b before being sent to the image model -- the user's raw idea is preserved but elevated. Narration scripts are written after video generation completes, ensuring the words match the actual visual content and timing.

### Zero-cost

The system uses exclusively free resources. Higgsfield.ai's unlimited models (Nano Banana for images, Kling 2.5 Turbo at 720p/5s for video) cost nothing. Ollama runs locally on Apple Silicon. F5-TTS synthesizes speech locally using MPS acceleration. There are no API keys with meters running. The only cost is electricity.

### Solo-scalability

One person built it. One person operates it. This is by design, not by limitation. File-based IPC eliminates database administration. JSON state files eliminate migration scripts. launchd eliminates container orchestration. The Page Object Model encapsulates browser automation complexity so that adding a new generation model means adding one class, not refactoring a system. Every architectural choice optimizes for a team of one.

---

## 3. Design Principles

### File-based IPC

All inter-process communication happens through JSON files on disk. The Bridge writes jobs to `state/whatsapp-jobs.json`. The Worker reads and updates them. The News Curator writes to `state/news-digest.json`. The Content Queue lives in `state/content-queue.json`. Prompt presets live in `state/prompt-presets.json`.

This is deliberate. JSON files are human-readable. They can be inspected with `cat`, edited with any text editor, backed up with `cp`, and version-controlled with `git`. There are no connection strings, no schema migrations, no query languages. When something goes wrong, the entire system state fits in a terminal window.

### Page Object Model

Browser automation against Higgsfield.ai uses a strict page object hierarchy. `BasePage` provides shared functionality (toast dismissal, unlimited toggle, submit button discovery). `NanoBananaPage` extends it for image generation. `WanVideoPage` and `KlingVideoPage` extend it for video generation. Each page object encapsulates the fragile DOM selectors, timing quirks, and modal handling that are specific to that generation model.

When Higgsfield changes their UI (and they do), exactly one file changes. The pipeline code that calls `generateImage()` or `generateVideo()` never knows.

### State Machines

Every job follows a strict status progression:

```
pending -> building_prompt -> generating_image -> generating_video -> delivering -> completed
```

Invalid transitions are rejected. A job in `completed` cannot move to `pending`. A job in `generating_image` can only move to `generating_video`, `delivering`, or back to `pending` (via crash recovery). The `VALID_TRANSITIONS` map is the single source of truth. This prevents silent corruption where a job ends up in an impossible state.

### Merge-before-save

The Bridge and Worker both read and write the same job file. Without protection, the Worker could overwrite a new job that the Bridge added while the Worker was processing. The `mergeBeforeSave()` pattern solves this: before every save, the Worker re-reads the file from disk, merges any new jobs that appeared, applies its updates to existing jobs, and writes the merged result. New job additions from the Bridge are never lost.

### Post-generation narration

Narration scripts are generated after video stitching completes, not before. The Ollama model receives the actual list of completed shots and the real video duration, then writes a narration script targeting approximately 2.5 words per second for natural speech pacing. F5-TTS synthesizes the audio. `addContinuousNarration()` overlays it with atempo adjustment for duration mismatch, fade-in at 0.5 seconds, and fade-out at 1.0 second. The narration always matches what the viewer sees.

### Nuclear clear

Before each video generation, the system clears localStorage, sessionStorage, and all IndexedDB databases, then performs a hard page reload. This prevents Higgsfield's client-side cache from serving stale frames from previous generations. This was learned the hard way -- cached start frames from earlier jobs would appear in new videos. The nuclear approach is blunt but reliable.

### Network interception

New image detection uses Playwright's `page.on("response")` interceptor to catch URLs from `images.higgs.ai` or `cloudfront.net`. This replaced DOM-based detection, which became unreliable because Higgsfield's Nano Banana page accumulates 40+ images from generation history in the gallery. Counting DOM elements or watching for new children is fragile when the baseline count is unpredictable. Network interception catches exactly what was just generated.

---

## 4. Content Guidelines

### Voice usage

Named voices from the 70-voice library are used for narration. The default voice is `morgan_freeman`. Users can specify any voice with the `-v` flag (e.g., `-v david_attenborough`, `-v nawazuddin_siddiqui`). Voice matching is fuzzy -- exact match, case-insensitive, startsWith, includes, and display name match are all tried in order.

### Quality bar

Every generated image is scored by the Ollama vision model. A score of 6 or higher (out of 10) passes quality review. A score below 6 triggers automatic regeneration with a re-enhanced prompt. A maximum of 2 retries are attempted before the job is marked as completed with the best available result.

### Rate limits

Per-user limits are enforced to prevent abuse and ensure fair access within the WhatsApp group:

- 5 generation requests per hour per user
- 20 generation requests per day per user

### Background music

BGM is mixed at a default volume of 0.15 -- present but never competing with narration. The 50-track library spans 10 categories (Cinematic, Ambient, Upbeat, Dramatic, Nature, Electronic, Lo-Fi, Classical, Corporate, World Music). Users can specify a BGM preset with the `-b` flag. Volume can be adjusted but should never overpower the voice track.

---

## 5. Architecture Philosophy

### Why JSON over databases

This is a single-user, single-machine system. A database would add a dependency (installation, configuration, backups, migrations) without adding value. JSON files are the simplest possible persistence layer. They are readable with `cat`, editable with `vim`, diffable with `git diff`, and recoverable by copying a file. The `mergeBeforeSave()` pattern provides the only concurrency guarantee the system needs. If the system ever needed multi-machine coordination, a database would make sense. It does not need that today, and premature infrastructure is the enemy of solo-scalability.

### Why browser automation

Higgsfield.ai does not offer a public API. The only way to access their free unlimited generation models is through the web UI. Playwright provides reliable browser automation with auto-waiting, network interception, and file upload support. The Page Object Model abstracts the inherent fragility of DOM-based automation into contained, replaceable modules. When (not if) Higgsfield changes their UI, the fix is localized to one page object file.

### Why launchd

launchd is the macOS-native service manager. It starts services on boot, restarts them on crash, and supports CalendarInterval for scheduled tasks (like the 8 AM news curator). It requires no installation -- it ships with every Mac. The alternative would be Docker (heavy, unnecessary for a single-machine setup), PM2 (a Node.js dependency to manage Node.js processes), or screen/tmux (no auto-restart, no scheduling). launchd is the right tool for a macOS-native pipeline.

### Why OpenClaw

OpenClaw is the WhatsApp gateway that handles the messy reality of messaging: message routing, media downloads (audio, images, video), multi-channel support (WhatsApp, Discord, Signal, iMessage), and delivery confirmation. It exposes a CLI (`openclaw message send`) and a structured log that the Bridge tails. Building a WhatsApp gateway from scratch would be months of work on authentication, encryption, and Meta's API. OpenClaw handles that so the pipeline can focus on content generation.

### Why Ollama

Ollama provides free, local, private LLM inference on Apple Silicon. qwen3:14b handles text tasks: prompt enhancement, Hindi-to-English translation, shot planning for lessons, narration script writing. minicpm-v handles vision tasks: image quality scoring. Running models locally means no API costs, no rate limits from cloud providers, no data leaving the machine, and no dependency on external service availability. The 14B parameter model is the sweet spot -- large enough for quality output, small enough to run alongside Playwright and F5-TTS on a MacBook Air.

---

## 6. Anti-patterns to Avoid

These are hard-won lessons from production failures. Every item on this list caused a real bug that took real time to diagnose.

**Never use `.remove()` on DOM elements in Higgsfield pages.** Higgsfield uses React, which maintains a virtual DOM. Removing elements directly breaks reconciliation -- React expects the element to still exist and throws errors or re-renders incorrectly. Instead, use CSS to hide elements: `pointer-events: none; opacity: 0`. The element remains in the DOM for React but is invisible and non-interactive for Playwright.

**Never use DOM `.click()` for React buttons.** React event handlers are attached via synthetic events, not native DOM listeners. A direct `element.click()` via `page.evaluate()` may not trigger the React handler. Instead, use Playwright's `page.mouse.click(x, y)` or `locator.click()`, which simulate real user interaction that React's event system recognizes.

**Never trust DOM element count for detecting new images.** Higgsfield's Nano Banana page accumulates 40+ images from generation history in the gallery. Counting elements before and after generation is unreliable because the baseline is unpredictable and history items may load asynchronously. Use Playwright's network response interceptor (`page.on("response")`) to catch the exact URL of the newly generated image.

**Never apply page settings before uploading a start frame.** Uploading a start frame to Higgsfield's video generation page resets the resolution to 1080p and disables the unlimited toggle. Settings (720p, unlimited) must be applied after the upload completes and after the image preview modal is dismissed. The correct order is: upload frame, dismiss modal, set 720p, enable unlimited, enter prompt, click generate.

**Never skip the image preview modal dismiss.** After uploading a start frame, Higgsfield displays a full-screen image preview modal. All page controls (prompt input, resolution selector, unlimited toggle) are hidden behind it. The `dismissImagePreviewModal()` function sends an Escape keypress to close it. Skipping this step causes all subsequent interactions to fail silently.

**Never import bridge's job types in the worker.** The Bridge (`automation/src/bridge/`) has its own `WhatsAppJob` interface that is not imported from the shared `job-types.ts`. This is a known architectural wart, not an accident. The Bridge runs in a different process with different dependencies. When adding new fields to the job schema, both interfaces must be updated manually and kept in sync.

---

## Closing Note

Higgis Pipeline exists to prove that a single person with a single machine can build a production content generation system that serves real users through the world's most ubiquitous messaging platform. Every architectural decision, every design principle, and every anti-pattern documented here serves that goal.

The system is not minimal because it lacks ambition. It is minimal because minimalism is what makes it possible for one person to understand, operate, and evolve the entire stack.
