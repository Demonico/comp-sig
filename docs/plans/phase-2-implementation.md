# Phase 2 Implementation Plan

## Context

Phase 1 built the pipeline with stubs. Phase 1.5 added Respan instrumentation. Phase 2 replaces the stubs with real LLM calls, adds streaming so the UI shows progress during real latency, and builds the Scoring Agent's prompt to consider prior signal history for the same competitor.

## Packages to Install

- `ai` — Vercel AI SDK core
- `@ai-sdk/anthropic` — Anthropic provider for Vercel AI SDK (includes built-in `webSearch` tool)
- `vitest` — test runner (dev)
- `vitest-browser-react` — React component testing (dev)

## Build Steps

### 1. Research Agent — Real LLM Implementation

Replace the stub in `src/agents/research.ts` with a real Vercel AI SDK `generateText` call using Anthropic Claude.

- Uses Anthropic's built-in `webSearch` tool (`anthropic.tools.webSearch_20260209()`) with `allowedDomains` to restrict searches to the five source platforms
- LLM constructs site-specific queries, executes searches via the built-in tool, extracts and classifies results
- Returns the same `ResearchResult[]` shape the stub currently returns
- `experimental_telemetry: { isEnabled: true }` on the AI SDK call so Respan captures it automatically as a child span of the `research` task
- Environment variable for `ANTHROPIC_API_KEY`
- **Files:** `src/agents/research.ts`, `.env.local`

**Tests:**
- Research agent output shape: returns valid `ResearchResult[]` with correct source/signalType enums (mock the LLM call boundary, not internal logic)
- **Files:** `src/agents/research.test.ts`

### 2. Scoring Agent — Real LLM Implementation with Prior History

Replace the stub in `src/agents/scoring.ts` with a real `generateText` call.

- Prompt receives a single research result and scores it 1–10 with reasoning
- **Prior signal history:** Before scoring, query `researchResults` for previous scored results for the same competitor (via `competitorId` → `searchRuns` → `researchResults` from earlier runs). Include them in the prompt as context so the LLM can judge whether a signal is strategic vs routine
- Prompt handles the case where no prior history exists (first run for a competitor)
- Returns the same `ScoringOutput` shape
- `experimental_telemetry: { isEnabled: true }` for Respan auto-capture
- Update the orchestrator to pass `competitorId` to `runScoringAgent` so it can query prior results
- **Files:** `src/agents/scoring.ts`, `src/app/api/runs/route.ts`

**Tests:**
- Prior history query: returns correct results for a competitor with history, returns empty array for a new competitor
- Scoring output shape: returns valid `ScoringOutput` with score in 1–10 range (mock the LLM call boundary)
- **Files:** `src/agents/scoring.test.ts`

### 3. Streaming

Replace the current POST-and-wait pattern with SSE streaming from the orchestrator to the UI.

- Orchestrator streams progress events as each pipeline step completes: run started, research complete, each result scored, run complete/failed
- UI reads the event stream and updates progressively — shows results appearing as they're scored rather than all at once
- Define an event type shape for the different event kinds
- Update the UI to handle the streaming response and render incrementally
- **Files:** `src/app/api/runs/route.ts`, `src/app/page.tsx`, `src/lib/events.ts`

**Tests:**
- Event serialization/parsing: event type shapes serialize and deserialize correctly
- Route handler: streams events in correct order for a successful run, streams error event on failure (mock agents)
- **Files:** `src/lib/events.test.ts`, `src/app/api/runs/route.test.ts`

### 4. UI Updates

- Update the running state to show live progress (which step is active, results appearing as scored)
- Add `export const maxDuration = 30` to the route handler to prevent streaming timeout
- **Files:** `src/app/api/runs/route.ts`, `src/app/page.tsx`

**Tests:**
- Component test: renders signal cards as they arrive from the stream, shows progress state during a run, shows error state on failure
- **Files:** `src/app/page.test.tsx`

## Verification

- Run `pnpm dev`, enter a competitor name, and see real research results streamed in and scored
- Check the Respan dashboard for:
  - `competitor-research-run` workflow trace
  - Auto-instrumented `generateText` spans inside the `research` and `score-result` tasks
  - Chain-of-thought reasoning visible in the scoring spans
- Run a second research for the same competitor — verify the Scoring Agent's reasoning references prior signals
- Run `pnpm vitest` — all tests pass

## What This Does NOT Include

- Synthesis Agent — Phase 3
- Direct platform integration (GitHub API) — Phase 3
- Corroboration highlights or feed controls — Phase 4
