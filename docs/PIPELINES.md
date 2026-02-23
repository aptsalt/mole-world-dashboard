# Generation Pipelines

## 1. Image Generation Pipeline

1. **Prompt Enhancement**: Ollama qwen3:14b rewrites the user description into a detailed image prompt covering style, lighting, and composition.
2. **Model Selection**: Default model is nano-banana-pro. Users can override via the `-m` flag with a model alias. Ollama can also auto-select a model based on `modelSpecialties` when the prompt suits a particular model's strengths.
3. **Page Object**: The NanoBanana page object navigates to the model URL, enters the enhanced prompt, and clicks the Generate Unlimited button.
4. **Network Interception**: `page.on("response")` catches new image URLs from `images.higgs.ai` or `cloudfront.net`. This approach is used instead of DOM-based detection because the gallery accumulates 40+ historical images, making DOM diffing unreliable.
5. **Quality Assessment**: Ollama minicpm-v vision model scores the generated image on a 1-10 scale. A score of 6 or higher passes.
6. **Retry**: If the score is below 6, the pipeline regenerates with an adjusted prompt. Maximum of 2 retries.
7. **Download**: The final image is saved to the output directory and copied to the OpenClaw workspace for delivery.

Key code: `automation/src/browser/page-objects/nano-banana.ts`, `automation/src/ollama/vision.ts`

---

## 2. Video Generation Pipeline

1. **Start Frame Upload**: The generated image is uploaded as the start frame on the video creation page.
2. **Modal Dismiss**: The upload triggers a full-screen image preview modal. The pipeline must press Escape to dismiss it via `dismissImagePreviewModal()` before any further interaction.
3. **Nuclear Clear**: Before generation, the pipeline clears localStorage, sessionStorage, and ALL IndexedDB databases, then performs a hard reload. This prevents stale cached frames from previous generations from corrupting the output.
4. **Settings Application**: AFTER upload and modal dismiss, the pipeline sets the model (Kling 2.5 Turbo), resolution (720p), duration (5s), and enables the Unlimited toggle. Settings MUST be applied after upload because the upload action resets them.
5. **Motion Prompt**: Ollama generates a motion description for the video based on the source image and user intent.
6. **Generate**: The pipeline clicks the "Generate Unlimited" button. Playwright locator uses `hasText: /generate/i` combined with `hasText: /unlimited/i`. The locator auto-scrolls if the button is off-viewport.
7. **Wait and Download**: Video generates in approximately 90 seconds on Kling 2.5 Turbo at 720p/5s. The file is downloaded when generation completes.
8. **Toast Handling**: `dismissToasts()` hides toast overlays at z-index 10000 that block button clicks. Uses `pointer-events: none; opacity: 0` instead of `.remove()` to avoid breaking React virtual DOM reconciliation.

Key code: `automation/src/browser/page-objects/wan-video.ts`, `automation/src/browser/browser-manager.ts`

---

## 3. Lesson Pipeline (6 shots x 5s = 30s)

1. **Shot Planning**: Ollama generates 6 shots, each with an image prompt and a motion prompt. Duration is forced to 5 seconds per shot regardless of what the LLM outputs.
2. **Per-Shot Generation**: For each shot, the pipeline enhances the image prompt, generates an image on Higgsfield, and generates a 5-second video. All shots use `skipNarration=true` because no audio is needed yet.
3. **Video Stitching**: FFmpeg stitches the 6 clips into a single silent 30-second video. `StitchOptions.silentInput` strips audio with `-an` during the normalization pass.
4. **Post-Video Narration**: `generatePostVideoNarration()` runs after video stitching is complete. Ollama writes a narration script based on the actual completed shots and the real video duration. The script targets approximately 2.5 words per second for natural speech pacing.
5. **TTS Generation**: F5-TTS generates narration audio from the script using the selected voice (default: morgan_freeman). Generation takes approximately 77 seconds on Apple Silicon MPS, or around 300 seconds for approximately 70 words.
6. **Audio Composition**: `addContinuousNarration()` uses FFmpeg to overlay the narration onto the video. Atempo adjustment handles duration mismatches between narration and video. Fade-in is 0.5 seconds, fade-out is 1.0 second. The `-c:v copy` flag preserves video quality by avoiding re-encoding. An optional BGM track can be mixed in at the configured volume.

Key code: `automation/src/composition/shot-planner.ts`, `automation/src/composition/video-stitcher.ts`, `automation/src/audio/audio-mixer.ts`

---

## 4. Film Pipeline (Multi-Scene)

1. **Outline Generation**: `film-planner.ts` uses Ollama to generate a multi-scene outline based on the selected template and user description.
2. **Template Selection**: 5 templates are available (documentary, drama, explainer, travel_vlog, product_launch). Each template provides defaults for scene count, voice, BGM, narrative arc, and system prompt additions.
3. **Per-Scene Generation**: Each scene is processed like a lesson (6 shots x 5s), producing a 30-second scene video.
4. **Scene Stitching**: All scene videos are stitched together with a configurable crossfade (default 0.5 seconds).
5. **Dialogue Mixing**: Multi-voice dialogue is handled via the cast system. `dialogue-mixer.ts` manages multi-voice audio with a configurable gap of 0.3 seconds between lines.
6. **Crash Recovery**: Film jobs track `sceneVideoPaths`, `completedSceneIndices`, and `currentScene`. On restart, completed scenes are skipped and processing resumes from the last incomplete scene.

Key code: `automation/src/composition/film-planner.ts`, `automation/src/composition/film-templates.ts`, `automation/src/audio/dialogue-mixer.ts`

---

## 5. News-to-Social Pipeline

1. **RSS Fetch**: `rss-fetcher.ts` fetches headlines from configured RSS feeds with a 15-second timeout, returning a maximum of 5 stories.
2. **Ollama Ranking**: `news-ranker.ts` uses Ollama to rank stories by relevance and virality potential.
3. **WhatsApp Digest**: The top 5 headlines are sent to WhatsApp as a numbered list.
4. **User Selection**: The user replies with numbers ("1,3,5" or "all") to select which stories to turn into content.
5. **Content Generation**: `content-prompts.ts` generates 4 Ollama prompts per selected story: caption, image prompt, video prompt, and hashtags.
6. **Media Generation**: The pipeline generates an image, then a video, and stores the results in `content-queue.json`.
7. **Social Queue**: `content-queue-store.ts` manages the queue. The Social Worker polls the queue and posts content to configured platforms.

Key code: `automation/src/news/`, `automation/src/social-worker.ts`

---

## 6. Claude Integration Pipeline

1. Messages starting with `claude` are detected by the Bridge, which writes a job to `state/claude-jobs.json`.
2. The Claude Worker polls every 5 seconds and spawns `claude -p --permission-mode plan --output-format text`.
3. Each invocation has a 5-minute timeout. Processing is sequential, with a PID lockfile preventing duplicate workers.
4. Output is chunked at 3800 characters with `[1/N]` prefixes to respect WhatsApp message size limits.
5. A DM allowlist restricts which phone numbers can use this feature.

Key code: `automation/src/claude-worker.ts`

---

## 7. Hindi Audio Pipeline

1. The Bridge detects an audio message when `mediaType` contains "audio", "ptt", "voice", or "ogg".
2. The media file is downloaded from OpenClaw.
3. The file is converted to 16kHz mono WAV via ffmpeg: `ffmpeg -i input -ar 16000 -ac 1 output.wav`.
4. Whisper-cpp transcribes the audio: `/opt/homebrew/bin/whisper-cli -m models/ggml-large-v3.bin -l hi`.
5. Ollama qwen3:14b translates the Hindi transcript to English.
6. Fallback chain if Ollama fails: Google Translate free API, then Whisper direct translate mode (`-tr` flag).
7. The translated English description is used to create an image generation job.

Key code: `automation/src/whatsapp/audio-translate.ts`

---

## 8. Browser Automation Patterns

- **Page Object Model**: BasePage serves as the parent class. NanoBanana, WanVideo, Seedance, and other page objects extend it to encapsulate UI complexity for each Higgsfield model.
- **Persistent Browser Profile**: The `browser-profile/` directory preserves OAuth sessions across restarts. No re-login is required between worker restarts.
- **Nuclear Storage Clear**: All browser storage (localStorage, sessionStorage, IndexedDB) is cleared before video generation to prevent stale cached frames from corrupting output.
- **Network Interception**: `page.on("response")` provides reliable image detection. DOM-based detection is avoided because the gallery accumulates dozens of historical images.
- **Toast Dismissal**: Overlay toasts are hidden with CSS (`pointer-events: none; opacity: 0`) instead of calling `.remove()`. Removing DOM nodes breaks React virtual DOM reconciliation.
- **Image Preview Modal**: After start frame upload, the full-screen preview modal is dismissed by pressing the Escape key.
- **Coordinate-based Clicks**: `page.mouse.click(x, y)` is used when DOM `.click()` does not trigger React event handlers. The button is located via DOM evaluate to get coordinates, then Playwright mouse performs the actual click.
- **Retry with Backoff**: `utils/retry.ts` provides configurable retry logic for transient failures.
- **Debug Screenshots**: Screenshots are captured at key pipeline steps and saved to the `screenshots/` directory for troubleshooting.
