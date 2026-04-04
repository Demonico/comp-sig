# CompSig — Architecture Document

> An agentic system that monitors competitors and surfaces meaningful signals before they become obvious.

---

## Project Context

### The Problem

Competitor monitoring tools like Crayon, Klue, and Kompyte detect *what* changed algorithmically. They tell you a
competitor updated their pricing page. They don't tell you what it means. The reasoning layer is missing — and reasoning
is where the value is.

### The Solution

A multi-agent system that takes a competitor name or URL, researches across five sources for meaningful competitive
signals, scores each result with explicit reasoning, and surfaces a ranked signal feed with business context.
Instrumented with Respan so the agent's reasoning is visible and auditable.

### Why It Has to Be Agentic

Two reasons. First, signal definition is fuzzy — "competitive signal" is not a deterministic pattern you can match with
a rule. It requires judgment about business implication. Second, signals have relationships. A hiring signal after a
funding announcement means something different than a hiring signal in isolation. Only a reasoning agent can interpret
patterns across signals over time. A static pipeline assumes you've already solved the hard part.

### The Prior Insight

The scoring agent does not just ask "is this signal significant?" It asks "is this signal significant given what we
already know about this competitor?" Prior signals update the probability that a new signal matters. A Series B three
weeks ago makes a sudden spike in engineering hiring a strategic alert rather than routine growth. This is reasoning
informed by prior context, applied to competitive intelligence and it is the core reason observability matters. You need to see the
reasoning chain to trust the output.

### Why Respan

The combination of reasoning plus observability is what no existing competitor monitoring tool offers. None of them show
you why they flagged something. Respan captures the reasoning chain — not just what the agent found but why it scored it
the way it did, what prior context it considered, and where it was uncertain. That trace is as valuable as the signal
itself.

### Application Context

Built as a portfolio piece when applying for the Senior Software Engineer, Frontend role at Respan. The Respan traces
are a first-class output of the project, not an afterthought.

---

## Stack

| Layer         | Choice           | Reason                                                     |
|---------------|------------------|------------------------------------------------------------|
| Framework     | Next.js          | Full stack, one repo, one deploy                           |
| AI SDK        | Vercel AI SDK    | Streaming primitives, agent tool calls, Respan integration |
| Model         | Anthropic Claude | Via Vercel AI SDK                                          |
| Observability | Respan           | Instrumentation, traces, evals                             |
| Database      | Supabase         | Persistence, auth, row-level security                      |
| Deploy        | Vercel           | One command deploy                                         |

---

## Sources

All sources accessed via Google search with site-specific queries. No platform APIs required except GitHub.

| Source       | Signal Examples                                       | Access                             |
|--------------|-------------------------------------------------------|------------------------------------|
| Reddit       | Customer complaints, comparisons, product discussions | Google (site:reddit.com)           |
| IndieHackers | Founder updates, product launches, positioning shifts | Google (site:indiehackers.com)     |
| Hacker News  | Launch posts, founder comments, community reactions   | Google (site:news.ycombinator.com) |
| Twitter/X    | Announcements, customer sentiment, founder messaging  | Google (site:twitter.com)          |
| GitHub       | New repos, commit cadence, public roadmap signals     | GitHub API (public repos, no auth) |

### Why Google as the Universal Search Layer

Using Google as a unified search layer rather than individual platform APIs significantly reduces auth complexity. The
agent's intelligence lives in how it constructs site-specific queries which is a more interesting reasoning problem than
API integration.

---

## Signal Types

Signal types are discrete and comprehensive. Every meaningful competitive action fits into exactly one category with no
overlap.

| Signal Type   | Description                                                   |
|---------------|---------------------------------------------------------------|
| `product`     | Anything shipped, announced, or changed in the product itself |
| `pricing`     | Changes to pricing, packaging, or plan structure              |
| `positioning` | Messaging changes, rebranding, new target market signals      |
| `hiring`      | Job postings that reveal strategic direction                  |
| `partnership` | Integrations, co-marketing, acquisitions, ecosystem moves     |
| `reputation`  | What customers are saying about them in the wild              |
| `corporate`   | Funding rounds, IPOs, leadership changes, legal events        |

### Signal Relationships

Signals are not independent. Hiring typically follows corporate events. Pricing changes often accompany positioning
shifts. The scoring agent accounts for these relationships by reasoning about prior signals before scoring new ones.
This is where the prior context insight manifests in practice.

### Sentiment as a Field, Not a Type

Sentiment is a modifier on other signal types, not a signal type itself. A product launch with negative customer
sentiment is different from one with positive sentiment. Sentiment lives as a derived quality on research results rather
than as a discrete category.

---

## Agent Architecture

Three agents with explicit handoffs coordinated by a lightweight orchestrator. Agents are separate API calls, not a
single long reasoning chain. This produces three distinct trace groups in Respan, making the architecture visible in the
observability layer.

---

### Agent 1: Research Agent

**Responsibility:** Source research and raw signal extraction.

**Input:** Competitor name and URL.

**Process:**

- Constructs signal-specific Google search queries for each source
- Queries are tuned to what each signal type looks like on that platform
- Extracts source, URL, and relevant text from results
- Classifies each result into a signal type

**Output:** Array of raw research results with source, URL, extracted text, and signal type.

**Respan trace value:** Multiple tool calls visible per source per signal type. Shows exactly which queries fired and
what came back.

---

### Agent 2: Scoring Agent

**Responsibility:** Reasoning about individual research results in context.

**Input:** Single research result plus prior signal history for this competitor.

**Process:**

- Reviews prior signals for this competitor before scoring
- Evaluates signal significance given prior context
- Produces a score 1-10 with explicit reasoning
- Identifies supporting evidence

**Output:** Structured scoring object per result including score, reasoning, and confidence.

**Respan trace value:** Chain-of-thought reasoning per result including prior context consideration. This is the core
intellectual property of the project. The trace shows why a signal scored 8 vs 4 and what prior signals influenced that
judgment.

---

### Agent 3: Synthesis Agent

**Responsibility:** Pattern detection across the current run's signals.

**Input:** All scored research results from Agent 2.

**Process:**

- Identifies relationships between signals in this run
- Flags corroborated signals that appear across multiple sources
- Produces a run summary with the most significant patterns
- Ranks results by score

**Output:** Ranked signal feed with pattern annotations and run summary.

**Respan trace value:** Cross-signal reasoning visible as a distinct trace group.

---

### Orchestrator

Lightweight coordinator. Not an agent, just application code.

**Responsibilities:**

- Accepts competitor input
- Creates or retrieves competitor record from DB
- Writes search_run record with status running
- Calls Research Agent, writes results to DB
- Calls Scoring Agent per result with prior signal context, updates DB
- Calls Synthesis Agent, updates run with summary
- Updates search_run status to complete or failed
- Streams progress to UI in real time

---

## Data Model

Six tables. Competitors are persistent system-level entities shared across users. Research results are shared and
cached. User relationships to competitors are tracked separately from the competitor entities themselves.

---

### guest_sessions

Identifies anonymous browsing sessions. Guests can research competitors without signing in. Their data persists and is
reassigned to their account if they later sign up.

```sql
id
uuid primary key default gen_random_uuid()
session_token   text not null unique
created_at      timestamptz default now()
last_active_at  timestamptz
```

---

### competitors

System-owned, shared entities. Deduplicated by name and URL. Research results belong to competitors, not to individual
users, enabling result reuse across users and reducing API costs.

```sql
id
uuid primary key default gen_random_uuid()
name            text not null
url             text
created_at      timestamptz default now()
```

---

### user_competitors

A user or guest's relationship to a competitor. Either user_id or session_id is populated, never both, never neither.
Enforced by check constraint.

```sql
id
uuid primary key default gen_random_uuid()
competitor_id   uuid references competitors(id)
user_id         uuid references auth.users(id)    -- null if guest
session_id      uuid references guest_sessions(id) -- null if authenticated
created_at      timestamptz default now()
check (
  (user_id is not null and session_id is null) or
  (user_id is null and session_id is not null)
)
unique (user_id, competitor_id)
```

---

### search_runs

One execution of the full agent pipeline for a competitor. Belongs to the system-level competitor, not to a specific
user. Results are shareable and cacheable across users researching the same competitor.

```sql
id
uuid primary key default gen_random_uuid()
competitor_id   uuid references competitors(id)
status          text not null -- 'running' | 'complete' | 'failed'
created_at      timestamptz default now()
completed_at    timestamptz
```

---

### research_results

Raw observations from the Research Agent, scored by the Scoring Agent. Immutable after creation. One row per source
result. Score and reasoning live here because they belong to the specific observation.

The Scoring Agent receives prior research results for the same competitor before scoring each new result, enabling
Bayesian-style reasoning where prior signals inform the significance of new ones.

```sql
id
uuid primary key default gen_random_uuid()
run_id          uuid references search_runs(id)
source          text not null -- 'reddit' | 'hackernews' | 'twitter' | 'indiehackers' | 'github'
url             text not null
extracted_text  text not null
signal_type     text not null -- 'product' | 'pricing' | 'positioning' | 'hiring' | 'partnership' | 'reputation' | 'corporate'
score           integer not null -- 1-10
reasoning       text not null
created_at      timestamptz default now()
```

---

## Guest to Authenticated Migration

When a guest signs up or signs in their research is reassigned to their authenticated account:

1. Look up guest_sessions record by current session token
2. Find all user_competitors rows with that session_id
3. Update: set user_id to the authenticated user, null out session_id
4. Handle conflicts: if the user already tracks a competitor the guest was tracking, keep the authenticated row and
   discard the guest row. Research results are shared anyway via competitors.
5. Delete or expire the guest_sessions record

Triggered by a Next.js API route immediately after the Supabase auth callback resolves.

---

## Access Control

| Role               | Read                                         | Write                           |
|--------------------|----------------------------------------------|---------------------------------|
| Guest              | Own session results only (via run ID in URL) | Can create competitors and runs |
| Authenticated user | Own rows only                                | Can create competitors and runs |
| Admin              | All rows                                     | All rows                        |

Enforced via Supabase Row Level Security policies.

---

## UI States

### Competitor Dashboard

Entry point. List of competitors the current user or guest is tracking. Add competitor input. Each competitor shows last
run date and signal count.

### Running

Live progress showing the agent working in real time. Streamed updates from the orchestrator as each agent step
completes. Should feel like watching a system think, not a spinner.

### Signal Feed

Ranked signal cards for a competitor. Each card shows signal type, score, source, supporting evidence, and the agent's
reasoning. Corroborated signals appearing across multiple sources are visually distinct.

---

## Explicit Scope Boundaries

### In Scope

- Competitor name or URL input
- Research across five sources
- Per-result scoring with visible reasoning and prior context
- Signal feed ranked by score
- Corroboration detection across sources
- Respan instrumentation throughout
- Guest mode with session persistence
- Supabase auth and guest-to-authenticated migration
- Shared competitor research results across users
- Vercel deploy

### Explicitly Out of Scope

- BYOK (planned post-launch feature)
- Email or Slack alerts
- Scheduled automatic re-runs
- Mobile optimization
- Custom signal type definitions
- Competitor comparison views

---

## Key Architectural Decisions and Rationale

**Competitors as system-owned shared entities** — Research results belong to the competitor, not the user. Two users
researching Stripe share the same cached results. Reduces API costs and enables the accumulated prior context to benefit from
aggregate signal history across all users.

**Contextual scoring** — The Scoring Agent receives prior signal history before scoring each new result. Prior
signals update the significance of new ones. This is the core reasoning capability that differentiates CompSig from
rule-based monitoring tools.

**Google as universal search layer** — Avoids four different API auth setups. Simpler, faster to build. Agent
intelligence lives in query construction rather than API integration.

**Explicit agent handoffs over single agent loop** — Produces distinct trace groups in Respan. Makes architecture
legible in the observability layer. More control over data flow between agents.

**Score on research_results** — Individual observations get individual scores informed by prior context. The Synthesis
Agent identifies patterns across scores. Raw scoring signal is preserved rather than collapsed prematurely.

**Guest mode with DB persistence** — Guests can use the full product without signing up. Their data persists and
migrates on signup. Removes friction from the viral moment.

**No candidates table** — In the original acquisition research version, candidates were unknown entities being surfaced
and deduplicated. In competitor monitoring the entity is already known. The deduplication problem does not exist.

**BYOK deferred** — Useful for model selection but adds scope. Noted as a planned post-launch feature to demonstrate
extensibility thinking without delaying the deadline.
