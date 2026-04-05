# Phase 1 Spec — Foundation & Research Pipeline

This spec covers the first working vertical slice of CompSig: from competitor input to a ranked signal feed, backed by
SQLite and streamed to the UI in real time.

---

## What Phase 1 Delivers

A user enters a competitor name and URL. The system researches that competitor across five sources, scores each result,
and displays a ranked signal feed. The entire pipeline is instrumented with Respan and streams progress to the UI as it
runs.

### What Phase 1 Does NOT Include

- Real LLM calls — agents are stubbed with hardcoded data (Phase 2)
- Respan instrumentation (added just before real LLM calls)
- Streaming / SSE (added when real latency exists from LLM calls)
- Prior signal history for contextual scoring (Phase 2)
- Synthesis Agent / corroboration detection (Phase 2)
- GitHub direct API integration (Phase 2)
- Guest sessions, auth, or user identity (Phase 4)
- Supabase / Postgres (Phase 4)

---

## 1. Database Schema

SQLite via Drizzle. Three tables. No JSON columns.

### competitors

System-owned entities. In Phase 1 there is no user identity, so these exist globally without ownership.

| Column     | Type    | Constraints         |
|------------|---------|---------------------|
| id         | text    | primary key (cuid2) |
| name       | text    | not null            |
| url        | text    |                     |
| created_at | integer | not null (unix ms)  |

### search_runs

One execution of the pipeline for a competitor.

| Column        | Type    | Constraints                        |
|---------------|---------|------------------------------------|
| id            | text    | primary key (cuid2)                |
| competitor_id | text    | not null, references competitors   |
| status        | text    | not null (running/complete/failed) |
| error_message | text    |                                    |
| created_at    | integer | not null (unix ms)                 |
| completed_at  | integer |                                    |

### research_results

Raw observations from the Research Agent, scored by the Scoring Agent. Immutable after creation.

| Column         | Type    | Constraints                                                                    |
|----------------|---------|--------------------------------------------------------------------------------|
| id             | text    | primary key (cuid2)                                                            |
| run_id         | text    | not null, references search_runs                                               |
| source         | text    | not null (reddit/hackernews/twitter/indiehackers/github)                       |
| url            | text    | not null                                                                       |
| extracted_text | text    | not null                                                                       |
| signal_type    | text    | not null (product/pricing/positioning/hiring/partnership/reputation/corporate) |
| score          | integer |                                                                                |
| reasoning      | text    |                                                                                |
| created_at     | integer | not null (unix ms)                                                             |

`score` and `reasoning` are nullable because the Research Agent writes the row before the Scoring Agent has scored it.

---

## 2. Orchestrator

Application code, not an agent. Exposed as a Next.js server action or API route that the UI calls to start a run.

### Lifecycle

1. Receive competitor name and URL from the client.
2. Find or create the competitor record (deduplicate by name, case-insensitive).
3. Insert a `search_runs` row with status `running`.
4. Call the Research Agent. For each result returned, insert a `research_results` row (score and reasoning null).
5. For each unscored research result in this run, call the Scoring Agent. Update the row with score and reasoning.
6. Update the `search_runs` row: status `complete`, set `completed_at`.
7. On any unrecoverable error, update status to `failed` with `error_message`.

Each step emits a streaming event to the client (see section 5).

### Error Handling

- If the Research Agent fails, mark the run as `failed`. No results to score.
- If the Scoring Agent fails on a single result, log the error and continue scoring remaining results. The failed result
  keeps null score/reasoning.
- If all Scoring Agent calls fail, mark the run as `failed`.

---

## 3. Research Agent

Uses the Vercel AI SDK with Anthropic Claude. Given a competitor, constructs site-specific Google search queries and
extracts signals.

### Input

```ts
type competitorInput = {
  competitorName: string
  competitorUrl?: string
}
```

### Behavior

The agent receives the competitor name and URL and has access to a Google Search tool. It constructs queries tuned to
each source and signal type. For example:

- `site:reddit.com "{competitorName}" pricing` to find pricing discussions on Reddit
- `site:news.ycombinator.com "{competitorName}"` to find Hacker News mentions

The agent decides which queries to run based on the competitor. It classifies each result into one of the seven signal
types.

### Output

Array of raw research results:

```ts
type researchResult = {
  source: 'reddit' | 'hackernews' | 'twitter' | 'indiehackers' | 'github'
  url: string
  extractedText: string
  signalType: 'product' | 'pricing' | 'positioning' | 'hiring' | 'partnership' | 'reputation' | 'corporate'
}
```

### Google Search Tool

The Research Agent needs a tool to perform Google searches. Options in order of preference:

1. **Serper API** — JSON results, generous free tier, simple API key auth.
2. **Google Custom Search API** — Official, 100 free queries/day.

The tool takes a query string and returns an array of `{ title, url, snippet }`. The agent interprets the snippets and
constructs the `extractedText` from them.

---

## 4. Scoring Agent

Uses the Vercel AI SDK with Anthropic Claude. Scores a single research result in isolation (prior context is Phase 2).

### Input

```ts
{
  competitorName: string
  result: {
    source: string
    url: string
    extractedText: string
    signalType: string
  }
}
```

### Behavior

The agent evaluates the research result and assigns a score from 1 to 10 with explicit reasoning. In Phase 1, scoring is
based solely on the result itself without prior signal history. The prompt should instruct the agent to consider:

- How specific and actionable is this signal?
- Is it a confirmed change or speculation?
- What is the potential business impact?
- How recent and reliable is the source?

### Output

```ts
{
  score: number   // 1-10
  reasoning: string
}
```

---

## 5. UI

A single page with a form and a results display.

### Form

- Competitor name (required) and optional URL.
- Submit calls the orchestrator route handler.

### Signal Feed

Displayed after a run completes. A list of signal cards sorted by score (highest first).

### Signal Card

Each card displays:

- **Signal type** — Labeled badge (e.g. `product`, `pricing`).
- **Score** — Numeric 1-10, visually prominent.
- **Source** — Which platform (Reddit, HN, etc.) with a link to the original URL.
- **Extracted text** — The relevant snippet the agent found.
- **Reasoning** — The Scoring Agent's explanation for the score.

Cards with null score/reasoning (scoring failures) appear at the bottom with an indicator that scoring failed.

### Error State

On failure, show the error message with an option to retry.

### Interaction

- Clicking a card's source link opens the original URL in a new tab.
- No filtering or sorting controls in Phase 1 (that's Phase 3).

---

## Build Sequence

This is the implementation order. Each step should result in a working, testable increment.

1. **Drizzle + SQLite setup** — Install dependencies, configure Drizzle, write schema, run initial migration.
2. **Stubbed agents** — Research and Scoring Agent stubs returning hardcoded data in the correct shape.
3. **Orchestrator** — Route handler that runs the full pipeline lifecycle and returns results as JSON.
4. **UI** — Form to enter a competitor, display signal cards sorted by score after run completes.

---

## Open Questions

1. **Google Search provider** — Serper vs Google Custom Search. Serper is simpler but adds a dependency. Need to pick
   before implementing the Research Agent.
2. **Competitor deduplication** — Phase 1 deduplicates by name (case-insensitive). Is that sufficient, or should we also
   match by URL domain?
3. **Result count limits** — Should the Research Agent have a target number of results per run, or let the agent decide
   how many queries to fire?
