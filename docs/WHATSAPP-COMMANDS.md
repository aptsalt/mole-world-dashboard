# WhatsApp Command Reference

Complete reference for all WhatsApp commands supported by the Mole World pipeline.

---

## 1. Command Syntax

```
molt <command> [flags] <description>
```

- All commands start with `molt` (case-insensitive).
- Flags can appear anywhere after the command keyword.
- Description is everything that is not a flag.
- Multi-line messages are normalized (newlines converted to spaces).

---

## 2. Commands

| Command | Aliases | Job Type | Description |
|---------|---------|----------|-------------|
| `generate` | `image`, `draw`, `create`, `make` | image | Generate a single AI image |
| `clip` | `video`, `animate` | clip | Generate image + 5s video |
| `lesson` | `doc`, `documentary`, `quote` | lesson | 6-shot narrated lesson (30s) |
| `film` | -- | film | Multi-scene film (5-20 scenes) |
| `status` | -- | -- | Show current queue status |
| `help` | `?` | -- | Show available commands |
| _(anything else)_ | -- | chat | Ollama chat response |
| `claude <question>` | -- | claude | Claude Code response (DM only) |
| `news` | -- | -- | Trigger news curator |

**Number selection:** When a news digest has been sent (status="sent"), replying with a number ("2"), a comma-separated list ("1,3,5"), or "all" creates news-content jobs for the selected articles.

---

## 3. Flags

| Flag | Format | Description | Example |
|------|--------|-------------|---------|
| `-v` | `-v <voiceKey>` | Voice for narration | `-v david_attenborough` |
| `-m` | `-m <imageAlias>` or `-m <imageAlias>:<videoAlias>` | Model selection | `-m b` or `-m b:c` |
| `-b` | `-b <bgmPresetKey>` | Background music preset | `-b cinematic_epic_rising` |
| `-s` | `-s <sceneCount>` | Scene count (film only) | `-s 7` |
| `-t` | `-t <templateKey>` | Film template | `-t documentary` |

---

## 4. Image Model Aliases

All 13 models are free unlimited.

| Alias | Model | Specialty |
|-------|-------|-----------|
| a | nano-banana-pro | Google flagship, best all-rounder (default) |
| b | seedream-4.5 | ByteDance next-gen 4K, artistic/stylized |
| c | flux-2-pro | Speed-optimized, sharp detail |
| d | higgsfield-soul | Ultra-realistic fashion/portraits |
| e | kling-o1 | Photorealistic, natural lighting |
| f | nano-banana | Google standard, fast |
| g | flux-2-flex | Next-gen, versatile styles |
| h | seedream-4.0 | ByteDance, image editing |
| i | z-image | Instant lifelike portraits |
| j | gpt-image | Versatile, follows complex text |
| k | reve | Advanced editing/transformations |
| l | multi-reference | Combines reference images |
| m | higgsfield-face-swap | Face replacement |

---

## 5. Video Model Aliases

| Alias | Model | Notes |
|-------|-------|-------|
| a | kling-2.5-turbo | Default. Free unlimited. 720p/5s. ~90s generation. |
| b | minimax-hailuo-2.3-fast | Free unlimited. Different visual style. |
| c | seedance-1.5-pro | Free unlimited. Seedance style. |

---

## 6. Voice Keys (Selected Examples)

70 total voices across 7 categories. Default: morgan_freeman. Fuzzy matching is supported (exact, case-insensitive, startsWith, includes, name match).

| Category | Examples |
|----------|----------|
| Narrators | morgan_freeman, david_attenborough, james_earl_jones |
| Actors | amitabh_bachchan, shah_rukh_khan, scarlett_johansson |
| Scientists | albert_einstein, carl_sagan |
| Leaders | winston_churchill, nelson_mandela |
| Tech | elon_musk, steve_jobs |

---

## 7. Film Templates

| Key | Name | Scenes | Voice | BGM | Arc |
|-----|------|--------|-------|-----|-----|
| documentary | Documentary | 7 | david_attenborough | ambient | Observe, Explore, Reveal |
| drama | Drama | 5 | morgan_freeman | dramatic | Setup, Conflict, Resolution |
| explainer | Explainer | 5 | morgan_freeman | corporate | Question, Breakdown, Insight |
| travel_vlog | Travel Vlog | 7 | morgan_freeman | world_music | Arrive, Explore, Reflect |
| product_launch | Product Launch | 5 | morgan_freeman | electronic | Tease, Reveal, Impact |

---

## 8. Full Examples

```
molt generate a cyberpunk city at night
molt image -m b a serene Japanese garden
molt clip a golden retriever running on a beach
molt clip -v david_attenborough -m c:b a coral reef ecosystem
molt lesson The Fall of Rome -v david_attenborough
molt lesson -v morgan_freeman -b cinematic_epic_rising Black holes explained
molt film -t documentary -s 7 The Amazon Rainforest
molt film -t drama -v morgan_freeman A story about finding home
molt What is quantum computing?
molt status
```

---

## 9. Rate Limits

- 5 requests per hour per user.
- 20 requests per day per user.
- No limits for admin phone.

---

## 10. Hindi Audio Support

- Send a Hindi voice message in the WhatsApp group.
- Bridge auto-detects audio, downloads, and converts to 16kHz WAV via ffmpeg.
- Transcribes using whisper-cpp (ggml-large-v3.bin model).
- Translates Hindi to English via Ollama qwen3:14b.
- Fallback chain: Ollama, Google Translate free, Whisper direct translate.
- Creates an image job with the translated description.

---

## 11. Special Behaviors

- `claude <question>` messages go to the Claude Code worker (DM only, allowlist restricted).
- Dashboard jobs (source: "dashboard") skip WhatsApp delivery.
- Priority system: higher priority runs first (0=normal, 100=immediate). Jobs age +1 priority per minute (cap +20).
- Scheduled jobs: the `scheduledAt` field delays processing until the specified time.
