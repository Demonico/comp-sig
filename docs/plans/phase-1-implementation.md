# Phase 1 Implementation Plan

## Context

Phase 1 was scoped too broadly in the original spec. After discussion, we're trimming it to the foundation: database, orchestrator, stubbed agents, and a basic UI. Streaming, Respan, and real LLM calls move to a later phase. The goal is to learn at an absorbable pace.

## Spec Changes

Update `docs/PHASE_1_SPEC.md` to reflect the reduced scope:

- **Remove** Section 5 (Streaming) — comes later with real LLM calls
- **Remove** Respan instrumentation from Sections 3 and 4 — comes just before real LLM calls
- **Simplify** Section 6 (Running UI) — no streaming events, just a form that triggers a run and shows results when done
- **Merge** Sections 6 and 7 into a single simple UI — form to start a run, display results when complete
- **Update** "What Phase 1 Does NOT Include" to add: streaming, Respan, real LLM calls
- **Update** Build Sequence to:
  1. Drizzle + SQLite setup — schema, migration
  2. Stubbed agents — return hardcoded data in the correct shape
  3. Orchestrator — route handler that runs the pipeline and returns results
  4. UI — form to enter competitor, display signal feed after run completes

## Prerequisites
- Package manager: **pnpm**
- Move existing `app/` to `src/app/` (update Next.js config for `src/` directory)
- Add project coding standards to `CLAUDE.md` (adapted from Idea Autopsy project-foundation rules, kept generic — covers TS, React, Next.js, styling, state management, dependency policy)
- Create testing standards skill file (adapted from Idea Autopsy testing rules, kept generic — covers Vitest, vitest-browser-react, conventions). Invoked manually when writing tests.

## Build Steps

### 1. Drizzle + SQLite Setup
- Install `drizzle-orm`, `drizzle-kit`, `better-sqlite3` (and `@types/better-sqlite3`)
- Schema file with three tables: `competitors`, `search_runs`, `research_results`
- Schema matches spec Section 1 exactly (no JSON columns)
- Generate and run initial migration
- **Files:** `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts`

### 2. Stubbed Agents
- Research Agent stub: accepts `{ competitorName, competitorUrl? }`, returns hardcoded array of research results
- Scoring Agent stub: accepts a research result, returns hardcoded `{ score, reasoning }`
- **Files:** `src/agents/research.ts`, `src/agents/scoring.ts`

### 3. Orchestrator
- Route handler (`POST`)
- Follows spec Section 2 lifecycle exactly (minus streaming events):
  1. Receive competitor name + URL
  2. Find or create competitor (dedupe by name, case-insensitive)
  3. Insert search_runs row (status: running)
  4. Call Research Agent stub, insert research_results rows
  5. Call Scoring Agent stub, update rows with score + reasoning
  6. Update search_runs row (status: complete)
  7. On error: status failed + error_message
- Returns the completed run data as JSON
- **Files:** `src/app/api/runs/route.ts`

### 4. UI
- Single page with a form (competitor name, optional URL)
- Submit calls the route handler
- On success, display signal cards sorted by score (highest first)
- Signal card shows: signal type badge, score, source + link, extracted text, reasoning
- On error, show error message with retry option
- **Files:** `src/app/page.tsx`, component files TBD

## Verification
- Run `pnpm dev`, enter a competitor name, see stubbed results rendered as signal cards
- Check SQLite DB has correct rows in all three tables
- Test error path by temporarily making a stub throw

## What Moves to Later Phases
- Streaming (SSE) — added when real LLM calls introduce actual latency
- Respan instrumentation — added just before swapping stubs for real agents
- Real LLM calls (Vercel AI SDK + Anthropic) — Phase 2
