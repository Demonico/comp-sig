# Early Signal — Architecture Document

> An agentic system that detects founders showing pre-sale signals before they list on acquisition marketplaces.

---

*DEPRECATED USE [ARCHITECTURE.md](ARCHITECTURE.md) INSTEAD*

## Project Context

### The Problem

Acquisition research on platforms like Acquire.com is reactive — you find sellers who have already decided to sell. The
most interesting acquisition targets are founders who are moving toward a sale but haven't formalized the decision yet.
Those signals exist publicly, scattered across Reddit, IndieHackers, Hacker News, Twitter/X, and GitHub — but the volume
makes manual monitoring impractical.

### The Solution

A multi-agent system that takes a niche or keyword, researches across five sources for pre-sale behavioral signals,
scores each result, deduplicates entities across sources, and presents a ranked list of candidates with signal
breakdowns.

### Why It Has to Be Agentic

The problem is fundamentally unbounded. You don't know in advance which sources will yield signal, what a "burned out
founder" looks like in text until you're reading it, or which entities across sources refer to the same person. A static
scraper + classifier pipeline assumes the hard parts are already solved. An agent can reason about novel signal patterns
it wasn't explicitly programmed to recognize.

### Application Context

Built as a portfolio piece when applying for the Senior Software Engineer, Frontend role at Respan. Instrumented with
Respan to demonstrate domain fluency in AI observability. The Respan traces are a first-class output of the project, not
an afterthought.

---

## Stack

| Layer         | Choice              | Reason                                                                 |
|---------------|---------------------|------------------------------------------------------------------------|
| Framework     | Next.js             | Full stack, one repo, one deploy                                       |
| AI SDK        | Vercel AI SDK       | Streaming primitives, agent tool calls, Respan integration             |
| Model         | Anthropic Claude    | Via Vercel AI SDK                                                      |
| Observability | Respan              | Instrumentation, traces, evals                                         |
| Database      | Supabase (Postgres) | Caching research results to avoid re-running expensive agent pipelines |
| Deploy        | Vercel              | One command deploy                                                     |

---

## Sources

All sources accessed via Google search with site-specific queries. No platform APIs required except GitHub.

| Source       | Signal Type                                                   | Access                               |
|--------------|---------------------------------------------------------------|--------------------------------------|
| Reddit       | Burnout posts, "is it worth it" threads, acquisition interest | Google (`site:reddit.com`)           |
| IndieHackers | Founder frustration, milestone posts that stopped             | Google (`site:indiehackers.com`)     |
| Hacker News  | "Anyone want to buy my..." posts, Show HN products gone quiet | Google (`site:news.ycombinator.com`) |
| Twitter/X    | Posting cadence shifts, "open to conversations" signals       | Google (`site:twitter.com`)          |
| GitHub       | Commit cadence drops on previously active repos               | GitHub API (public repos, no auth)   |

### Why Google as the Universal Search Layer

Using Google as a unified search layer rather than individual platform APIs significantly reduces auth complexity and is
architecturally cleaner for a two-day build. The agent's intelligence lives in how it constructs site-specific queries
rather than which APIs it can hit — which is actually a more interesting reasoning problem.

---

## Signal Types

Signal types are platform-agnostic behavioral patterns. The same signal type can surface on multiple sources. What
changes per source is what that signal looks like in text.

| Signal Type       | Description                                                       | Example Sources                 |
|-------------------|-------------------------------------------------------------------|---------------------------------|
| `burnout`         | Founder expressing exhaustion, frustration, or loss of motivation | Reddit, Twitter/X, IndieHackers |
| `going_quiet`     | Previously active presence that has gone silent                   | GitHub, IndieHackers            |
| `explicit_intent` | Direct statements about wanting to sell or exit                   | Reddit, Hacker News             |

---

## Agent Architecture

Three agents with explicit handoffs coordinated by a lightweight orchestrator. Agents are separate API calls, not a
single long reasoning chain. This produces three distinct trace groups in Respan, making the architecture visible in the
observability layer.

### Why Explicit Handoffs Over a Single Agent Loop

A single agent loop with tool calls would produce one long trace that's harder to interpret. Explicit handoffs between
agents produce three distinct trace groups in Respan — Research, Scoring, Synthesis — each with a clear responsibility.
This makes the architecture legible in the observability layer, which is the point.

---

### Agent 1: Research Agent

**Responsibility:** Source research and raw signal extraction.

**Input:** Keyword or niche string.

**Process:**

- Constructs signal-specific Google search queries for each source
- Queries are tuned to what burnout and pre-sale intent looks like on that platform, not generic searches
- Extracts entity name, URL, and relevant text from results

**Output:** Array of raw research results with source, URL, extracted text, and initial signal classification.

**Respan trace value:** Multiple tool calls visible per source per signal type. Shows exactly which queries fired and
what came back.

---

### Agent 2: Scoring Agent

**Responsibility:** Reasoning about individual research results.

**Input:** Single research result (source, URL, extracted text, signal type).

**Process:**

- Evaluates the signal quality of the result
- Produces a score 1–10 with explicit reasoning
- Identifies supporting evidence quotes

**Output:** Structured scoring object per result.

**Note:** Runs once per research result. With 10–20 results this produces 10–20 distinct traces in Respan — the most
reasoning-dense part of the pipeline and the most interesting trace surface.

**Respan trace value:** Chain-of-thought reasoning per result. Shows why a result scored 8 vs 4 — this is the core
intellectual property of the project.

---

### Agent 3: Synthesis Agent

**Responsibility:** Deduplication, rollup scoring, and final ranking.

**Input:** All scored research results from Agent 2.

**Process:**

- Groups results by entity (same founder appearing on Reddit and HN is one entity, not two)
- Creates a candidate record per unique entity
- Rolls up individual scores into a candidate score (average, with a bump for corroboration)
- Ranks candidates by final score
- Marks candidates as corroborated if they appear across more than one source

**Output:** Ranked list of candidates with rolled-up scores and source linkages.

**Key insight:** Cross-source corroboration is a confidence multiplier. A candidate scoring 6 on three sources outranks
one scoring 8 on one source. The act of deciding that two research results refer to the same entity is itself a
meaningful decision — stored explicitly in `candidate_sources`.

**Respan trace value:** Deduplication logic and rollup reasoning visible as a distinct trace group.

---

### Orchestrator

Lightweight coordinator. Not an agent — just application code.

**Responsibilities:**

- Accepts search run input
- Writes `search_run` record to DB with status `running`
- Calls Research Agent, writes results to DB
- Calls Scoring Agent per result, updates DB
- Calls Synthesis Agent, writes candidates to DB
- Updates `search_run` status to `complete` or `failed`
- Streams progress to UI so the user sees the agent working in real time

---

## Data Model

Four tables. Each has a single clear responsibility.

### `search_runs`

Represents one execution of the full pipeline for a given keyword.

```sql
id
uuid primary key default gen_random_uuid()
keyword       text not null
status        text not null  -- 'running' | 'complete' | 'failed'
created_at    timestamptz default now()
completed_at  timestamptz
```

---

### `research_results`

Raw observations from the Research Agent. One row per source result. Immutable after creation — these are facts about
what was found, not derived data.

Each result is individually scored by the Scoring Agent. Score and reasoning live here because they belong to the
specific observation, not to the derived candidate entity.

```sql
id
uuid primary key default gen_random_uuid()
run_id          uuid references search_runs(id)
source          text not null  -- 'reddit' | 'hackernews' | 'twitter' | 'indiehackers' | 'github'
url             text not null
extracted_text  text not null
signal_type     text not null  -- 'burnout' | 'going_quiet' | 'explicit_intent'
score           integer not null  -- 1-10, assigned by Scoring Agent
reasoning       text not null
created_at      timestamptz default now()
```

---

### `candidates`

Derived entities produced by the Synthesis Agent after deduplication. One row per unique founder or product identified
across all research results for a run.

The rolled-up score is calculated by the Synthesis Agent from the individual `research_results` scores. `corroborated`
is true when the candidate appears in more than one source.

```sql
id
uuid primary key default gen_random_uuid()
run_id          uuid references search_runs(id)
entity_name     text not null
score           integer not null  -- rolled up from research_results scores
corroborated    boolean not null default false
created_at      timestamptz default now()
```

---

### `candidate_sources`

Join table linking candidates to the research results that produced them.

This is not a generic many-to-many convenience table. It is the explicit artifact of the Synthesis Agent's deduplication
decision — the record of which research results were determined to refer to the same entity. That decision is worth
storing.

A research result maps to exactly one candidate. A candidate can have many research results (one per source where it
appeared).

```sql
id
uuid primary key default gen_random_uuid()
candidate_id        uuid references candidates(id)
research_result_id  uuid references research_results(id)
```

---

## UI States

Three states, each with a distinct design challenge.

### 1. Input

Search bar, keyword entry, run button. Secondary: list of previous search runs the user can revisit without re-running
the pipeline.

### 2. Running

Live progress showing the agent working in real time. Stream updates from the orchestrator as each agent step completes.
This is where Respan traces become visible — the UI should feel like watching a system think, not a spinner.

### 3. Results

Ranked candidate cards. Each card shows:

- Entity name
- Final score (1–10)
- Signal type(s)
- Corroborated badge if applicable
- Source links
- Supporting evidence from the research results

---

## Explicit Scope Boundaries

### In Scope

- Single keyword input
- Research across five sources
- Per-result scoring with visible reasoning
- Candidate deduplication and rollup scoring
- Ranked results UI
- Respan instrumentation throughout
- Caching of research results to Supabase

### Explicitly Out of Scope

- Outreach message generation
- Persistent user accounts
- Saved searches or search history beyond the current session list
- Continuous background monitoring
- Mobile optimization
- Multi-tenancy

---

## Key Architectural Decisions and Rationale

**Google as universal search layer** — Avoids four different API auth setups. Simpler, faster to build, still produces
real signal. The agent's intelligence lives in query construction rather than API integration.

**Explicit agent handoffs over single agent loop** — Produces distinct trace groups in Respan. Makes architecture
legible in the observability layer. More control over data flow between agents.

**Score on research_results, not candidates** — Individual observations get individual scores. The Synthesis Agent rolls
them up. This preserves the raw scoring signal rather than collapsing it prematurely.

**candidate_sources as explicit join table** — Deduplication is a meaningful decision worth storing, not just a derived
query. A nullable foreign key on research_results would create a chicken-and-egg ordering problem and semantically
awkward nulls.

**No separate backend** — Next.js API routes handle agent orchestration and streaming. One repo, one deploy, no CORS.
Vercel function timeout risk mitigated by streaming progress rather than waiting for full results.

**Supabase over Vercel Postgres** — Vercel Postgres no longer available. Supabase is familiar, well-integrated with
Next.js, and handles the caching use case cleanly.

**No outreach generation** — Outreach drafting is the least differentiated part of the system and adds implementation
time without advancing the core thesis. The hard problem is signal detection, not copywriting.
