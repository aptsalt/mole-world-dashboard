# AI Models, Voices & Background Music

Comprehensive reference for all AI models, voice profiles, and background music available in the Mole World pipeline.

---

## 1. Image Models (13 Free Unlimited)

| Alias | Model ID | Specialty | Higgsfield URL |
|-------|----------|-----------|----------------|
| a | nano-banana-pro | Google flagship. Best all-rounder for photorealistic, cinematic, general purpose. | /image/nano_banana_2 |
| b | seedream-4.5 | ByteDance next-gen 4K. Excellent for artistic, stylized, high-resolution. | /image/seedream_v4_5 |
| c | flux-2-pro | Speed-optimized detail. Great for fast, sharp, detailed images. | /image/flux_2 |
| d | higgsfield-soul | Ultra-realistic fashion visuals. Best for people, fashion, portraits. | /image/soul |
| e | kling-o1 | Photorealistic. Excellent at realistic scenes and natural lighting. | /image/kling-o1-image |
| f | nano-banana | Google standard. Fast, good quality, slightly less detail than Pro. | /image/nano_banana_2 |
| g | flux-2-flex | Next-gen flexible. Versatile, handles diverse styles well. | /image/flux_2 |
| h | seedream-4.0 | ByteDance advanced. Good for image editing and transformations. | /image/seedream_v4_5 |
| i | z-image | Instant lifelike portraits. Best for faces, headshots, character portraits. | -- |
| j | gpt-image | Versatile text-to-image. Good at following complex text instructions precisely. | -- |
| k | reve | Advanced editing model. Good for artistic edits and transformations. | -- |
| l | multi-reference | Multiple edits in one shot. Best when combining reference images. | -- |
| m | higgsfield-face-swap | Face swapping. Best for face replacement tasks. | -- |

**Default**: `nano-banana-pro` (alias `a`).

**Usage**: Users select via the `-m` flag in WhatsApp commands. For image-only: `-m b` (seedream). For image + video: `-m b:a` (seedream image, kling video).

---

## 2. Video Models

### Free Unlimited (4 models)

| Alias | Model ID | Notes |
|-------|----------|-------|
| a | kling-2.5-turbo | Default. 720p/5s. ~90s generation. Best general-purpose free video model. |
| b | minimax-hailuo-2.3-fast | Different visual style. Free unlimited. |
| c | seedance-1.5-pro | Seedance style. Free unlimited. |
| -- | sora-2-queue | Queue-based. Long wait times (up to 60 min). |

### Credit-Based (7 models -- NOT used by default)

| Model ID | Notes |
|----------|-------|
| wan-2.5 | No unlimited for video (only image). |
| sora-2 | Premium Sora. |
| kling-2.6 | Newer Kling. |
| kling-3.0 | Latest Kling. |
| veo-3.1 | Google Veo. |
| veo-3 | Google Veo. |
| wan-2.6 | Newer Wan. |

**Default video config**: Kling 2.5 Turbo at 720p/5s -- the ONLY free unlimited video configuration confirmed to work reliably.

**Critical notes**:
- Wan 2.5 does NOT support unlimited for video (only image).
- Start frame upload resets page settings (resolution reverts to 1080p, unlimited toggle disables). Resolution and unlimited MUST be applied AFTER upload, not before.
- Nuclear storage clear (localStorage + sessionStorage + all IndexedDB databases + hard reload) runs before each video generation to prevent stale cached frames.

---

## 3. Smart Model Selection

Ollama can auto-select the best image model based on the user's description. The `modelSpecialties` map in `config.ts` provides descriptions for each model. The prompt builder queries Ollama: "Given this image description, which model would produce the best result?" and Ollama returns one of the 13 model keys.

This is optional -- users can explicitly pick via the `-m` flag. When no model is specified, the pipeline defaults to `nano-banana-pro` (alias `a`).

**Resolution flow**:
1. Bridge parses `-m X` (image only) or `-m X:Y` (image:video) from molt commands.
2. Worker resolves aliases via `resolveImageModel()` / `resolveVideoModel()` in the config module.

---

## 4. Voice Library (70 Voices)

### Overview

- 70 voice profiles across 7 categories
- Stored in `automation/voice-library/voices.json`
- Reference audio in `automation/voice-library/` per voice
- Default voice: `morgan_freeman`

### Categories (with examples)

| Category | Example Voices |
|----------|---------------|
| Narrators | morgan_freeman, david_attenborough, james_earl_jones, peter_coyote |
| Actors (Hollywood) | scarlett_johansson, benedict_cumberbatch, cate_blanchett |
| Actors (Bollywood) | amitabh_bachchan, shah_rukh_khan, priyanka_chopra |
| Scientists | albert_einstein, carl_sagan, neil_degrasse_tyson |
| Leaders | winston_churchill, nelson_mandela, barack_obama |
| Tech | elon_musk, steve_jobs |
| Other | alan_watts, bob_ross |

### Fuzzy Matching

`getVoice()` supports multiple match strategies, tried in order:

1. **Exact key match** -- `morgan_freeman`
2. **Case-insensitive match** -- `Morgan_Freeman`
3. **startsWith match** -- `morgan`
4. **includes match** -- `freeman`
5. **Display name match** -- `Morgan Freeman`

### Quality Status

Each voice has a quality status: `pending`, `good`, or `replace`. The Voice Lab dashboard page (`/voices`) shows quality status and allows testing via the Test Voice button.

### Missing References

4 voices have missing reference audio files:
- nawazuddin_siddiqui
- pankaj_tripathi
- vidya_balan
- mahira_khan

### WhatsApp Usage

Select a voice with the `-v` flag:

```
molt clip -v morgan_freeman a sunset over mountains
molt lesson -v david_attenborough The Fall of Rome
```

---

## 5. TTS Engine

### Architecture

- **F5-TTS**: Primary TTS engine. Runs in Python venv at `automation/tts-env/`.
- **OpenVoice**: Secondary engine for voice conversion.
- **Python scripts**: `tts-env/generate_f5tts.py`, `tts-env/generate_openvoice.py`
- **TypeScript wrapper**: `automation/src/tts/tts-engine.ts` -- parses JSON from stdout, handles non-zero exit codes (warnings cause non-zero but output is valid).

### Performance

- ~77s generation on Apple Silicon MPS (Metal Performance Shaders)
- ~300s for ~70 words (lesson narration)
- Generation timeout: 600s (configurable)

### Setup

```bash
bash scripts/setup-tts.sh
```

Installs F5-TTS + OpenVoice + yt-dlp. Critical: must use setuptools 70.0.0 (82.0+ removed `pkg_resources`).

### Environment

`pythonEnv()` sets `PYTHONHASHSEED=0` for reproducibility. 600s timeout for long narrations.

### Post-Video Narration (Lesson Pipeline)

For lessons, narration is generated AFTER video stitching:

1. 6 shots generate video-only (skipNarration=true).
2. Videos are stitched into a single silent video.
3. `generatePostVideoNarration()` writes a narration script based on actual completed shots and real video duration.
4. Targets ~2.5 words/sec for natural speech pacing.
5. TTS generates the narration audio.
6. `addContinuousNarration()` overlays narration onto the video with atempo adjustment for duration mismatch, fade-in 0.5s / fade-out 1.0s.

---

## 6. BGM Library (50 Tracks)

### Overview

- 50 tracks across 10 categories (5 each)
- Metadata in `automation/bgm-library/bgm-presets.json`
- Tracks stored at `automation/bgm-library/tracks/{key}/track.mp3`
- Default volume: 0.15 (subtle background, never louder than narration)

### Categories

| Category | Description |
|----------|-------------|
| Cinematic | Epic orchestral scores |
| Ambient | Atmospheric, calm backgrounds |
| Upbeat | Energetic, positive |
| Dramatic | Tension, suspense |
| Nature | Natural soundscapes |
| Electronic | Synth, modern |
| Lo-Fi | Chill, relaxed beats |
| Classical | Piano, strings |
| Corporate | Professional, clean |
| World Music | Cultural, diverse instruments |

### Download CLI

```bash
# Audit which tracks need downloading
npx tsx src/bgm/bgm-downloader.ts --audit

# Download all tracks
npx tsx src/bgm/bgm-downloader.ts --download-all

# Download specific track
npx tsx src/bgm/bgm-downloader.ts --download cinematic_epic_rising
```

Downloads via yt-dlp, converts to 44.1kHz stereo MP3 via ffmpeg.

### Dashboard Integration

- BGM picker on Narration Studio page (between Voice & Audio and Compose sections)
- Category tabs, track preview, download button, volume slider (0-0.5)
- API endpoints:
  - `GET /api/bgm` -- list all tracks
  - `PATCH /api/bgm` -- update quality status
  - `POST /api/bgm/download` -- trigger download

### WhatsApp Usage

Select BGM with the `-b` flag:

```
molt lesson -v morgan_freeman -b cinematic_epic_rising The Fall of Rome
molt clip -b ambient_forest_rain a misty forest at dawn
```

---

## Quick Reference: WhatsApp Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `-m X` | Image model alias | `-m b` (seedream) |
| `-m X:Y` | Image:Video model aliases | `-m b:a` (seedream + kling) |
| `-v KEY` | Voice selection | `-v david_attenborough` |
| `-b KEY` | BGM preset | `-b cinematic_epic_rising` |

### Full Command Examples

```
molt generate a photorealistic mountain sunset
molt generate -m b a stylized cyberpunk city
molt clip -v morgan_freeman -m b:a a dramatic ocean storm
molt lesson -v david_attenborough -b cinematic_epic_rising The Rise of AI
molt doc -v carl_sagan The Pale Blue Dot
```
