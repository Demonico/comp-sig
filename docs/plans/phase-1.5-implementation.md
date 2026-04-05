# Phase 1.5 Implementation Plan

## Context

Phase 1 built the pipeline end-to-end with stubs. Phase 1.5 adds Respan instrumentation before real LLM calls arrive in Phase 2. This means we can verify the tracing skeleton works using the existing stubs — any issues are Respan issues, not LLM issues.

This is one of the two main learning goals of the project: understanding how to instrument an agentic system for observability.

## Packages to Install

- `@respan/respan` — core SDK, initialization and configuration
- `@respan/tracing` — tracing primitives
- `@respan/instrumentation-vercel` — auto-instruments Vercel AI SDK calls (no-op until real agents in Phase 2, but installed now so the pipeline is ready)

## Build Steps

### 1. Respan Initialization

- Create `instrumentation.ts` at the project root using Next.js's instrumentation hook
- Initialize Respan with `VercelAIInstrumentor` in the `register()` function
- Add `serverExternalPackages` to `next.config.ts` for Respan packages
- Add `RESPAN_API_KEY` to `.env.local`
- **Files:** `instrumentation.ts`, `next.config.ts`, `.env.local`

### 2. Orchestrator Trace Structure

Since stubs don't make real AI SDK calls, auto-instrumentation won't capture anything yet. Use Respan's decorators (`withWorkflow`, `withTask`) to manually wrap the orchestrator lifecycle and create the trace hierarchy:

- `withWorkflow({ name: "competitor-research-run" })` — wraps the full run
- `withTask({ name: "research" })` — wraps the `runResearchAgent()` call
- `withTask({ name: "scoring" })` — wraps the scoring loop
- Individual `withTask({ name: "score-result" })` inside the loop for each result
- Use `propagateAttributes` to attach `customer_identifier` (competitor name) and `thread_identifier` (run ID) to the trace

When real agents arrive in Phase 2, the `VercelAIInstrumentor` will automatically capture `generateText`/`streamText` calls as child spans inside these tasks — no additional instrumentation needed.

- **Files:** `src/app/api/runs/route.ts`

### 3. Verification

- Run `pnpm dev`, trigger a run with a competitor name
- Confirm the trace appears in the Respan dashboard at `platform.respan.ai/platform/traces` with:
  - A `competitor-research-run` workflow
  - Child `research` task
  - Child `scoring` task containing individual `score-result` tasks
  - Competitor name and run ID as trace attributes
- Confirm stubs still work identically — no behavior change, just visibility added

## What This Does NOT Include

- Real LLM calls — Phase 2
- Streaming — Phase 2
- Vercel AI SDK auto-instrumentation will be installed but inactive until Phase 2's real `generateText`/`streamText` calls
