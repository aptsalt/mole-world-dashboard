# Higgis Pipeline — Documentation

One message, one masterpiece. AI content generation via WhatsApp.

---

## Quick Links

| Document | Description | Audience |
|----------|-------------|----------|
| [VISION.md](./VISION.md) | Vision, values & design principles | Everyone |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture & data flow | Engineers |
| [CONFIGURATION.md](./CONFIGURATION.md) | CONFIG reference & environment | Engineers, Ops |
| [SERVICES.md](./SERVICES.md) | Service inventory & management | Ops |
| [WHATSAPP-COMMANDS.md](./WHATSAPP-COMMANDS.md) | WhatsApp command reference | Users |
| [PIPELINES.md](./PIPELINES.md) | Generation pipeline deep-dives | Engineers |
| [MODELS-AND-VOICES.md](./MODELS-AND-VOICES.md) | AI models, voices & BGM | Users, Engineers |
| [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) | File-based IPC & job schemas | Engineers |
| [DASHBOARD.md](./DASHBOARD.md) | Dashboard pages & API routes | Engineers |
| [TESTING.md](./TESTING.md) | Test framework & coverage | Engineers |
| [RUNBOOK.md](./RUNBOOK.md) | Operations & troubleshooting | Ops |

---

## Getting Started

Read these five documents in order to build a working mental model of the system:

1. [VISION.md](./VISION.md) — Understand the project's purpose and guiding principles.
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — Learn how services connect and data flows between them.
3. [WHATSAPP-COMMANDS.md](./WHATSAPP-COMMANDS.md) — Try the commands as a user.
4. [PIPELINES.md](./PIPELINES.md) — Follow a job from message to delivered media.
5. [RUNBOOK.md](./RUNBOOK.md) — Know how to operate, monitor, and fix the system.

---

## Reference

Deep-dive material for engineers building on or extending the system.

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Service topology, data flow diagrams, IPC boundaries.
- [CONFIGURATION.md](./CONFIGURATION.md) — Every CONFIG key, environment variable, and default value.
- [PIPELINES.md](./PIPELINES.md) — Image, clip, lesson, and content pipelines step by step.
- [MODELS-AND-VOICES.md](./MODELS-AND-VOICES.md) — Model aliases, voice library, BGM presets, TTS engines.
- [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) — Job JSON schemas, file-based IPC, merge strategy, recovery.
- [DASHBOARD.md](./DASHBOARD.md) — Dashboard pages, API route inventory, WebSocket events.
- [TESTING.md](./TESTING.md) — Test structure, running tests, coverage targets.

## Operations

Day-to-day management and user-facing documentation.

- [SERVICES.md](./SERVICES.md) — launchd service definitions, health checks, log locations.
- [WHATSAPP-COMMANDS.md](./WHATSAPP-COMMANDS.md) — Full command syntax with flags and examples.
- [RUNBOOK.md](./RUNBOOK.md) — Startup procedures, common failures, recovery playbooks.

---

## Existing Guides

These documents predate the structured docs and remain valuable references.

- [higgsfield-production/](./higgsfield-production/) — 21 production guides covering Higgsfield platform automation, browser profile management, and generation strategies.
- [higgisfield-pipeline/](./higgisfield-pipeline/) — Pipeline architecture notes and early design decisions.
- [STRATEGIC-PLAN.md](./STRATEGIC-PLAN.md) — Portfolio roadmap and long-term project direction.
- [WHATSAPP-PIPELINE-PLAN.md](./WHATSAPP-PIPELINE-PLAN.md) — Original WhatsApp pipeline architecture plan and design rationale.
