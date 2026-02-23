# Testing

## 1. Test Framework
- **Runner**: Vitest
- **Config**: `automation/vitest.config.ts`
- **Environment**: Node.js
- **Timeout**: 10 seconds per test
- **Include pattern**: `tests/**/*.test.ts`
- **Run**: `cd automation && npm test`
- **Watch**: `cd automation && npm run test:watch`

## 2. Test Files

| File | Tests | What It Covers |
|------|-------|----------------|
| `tests/job-queue.test.ts` (19.8 KB) | ~30 | WhatsAppJobQueue: load, save, addJob, getNextPending, updateStatus, mergeBeforeSave, priority aging, scheduling, recovery |
| `tests/shot-planner.test.ts` (11.8 KB) | ~15 | Shot planning: 6-shot generation, duration enforcement, prompt structure, post-video narration |
| `tests/film-planner.test.ts` (7.6 KB) | ~12 | Film outlines: template selection, scene count, multi-scene structure, crash recovery fields |
| `tests/dialogue-mixer.test.ts` (3.4 KB) | ~8 | Multi-voice dialogue: cast assignment, line parsing, audio gap timing |
| `tests/language-detect.test.ts` (3.5 KB) | ~10 | Language detection: Hindi identification, script detection, transliteration handling |

**Total: ~75 tests across 5 files**

## 3. Running Tests

```bash
# Run all tests
cd mole-world-2/automation
npm test

# Watch mode
npm run test:watch

# Run specific test file
npx vitest tests/job-queue.test.ts

# Type checking (no test runner)
npx tsc --noEmit
```

## 4. What Is NOT Tested

| Area | Reason |
|------|--------|
| Browser automation (Playwright page objects) | Requires live Higgsfield session, not unit-testable |
| API routes (Next.js) | Would need integration test setup with Next.js test server |
| UI components (React) | No component testing framework configured |
| Integration tests | Services depend on external systems (Ollama, OpenClaw, Higgsfield) |
| End-to-end tests | Full pipeline requires all 7 services running |
| TTS engine | Requires Python venv + F5-TTS model (~2.9 GB) |

## 5. Test Patterns Used
- **In-memory state**: Tests create temporary job queues without touching disk
- **Zod validation**: Tests verify schema parsing and default application
- **State machine transitions**: Tests verify valid/invalid status transitions
- **Mocked Ollama**: Shot planner tests mock Ollama responses
- **Boundary testing**: Priority limits (0-100), scene counts (1-20), batch counts (1-4)
