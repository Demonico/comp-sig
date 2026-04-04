# Build Outline

## Phase 1

### Cross-cutting
- **Run state:** SQLite schema (via Drizzle) for run id, competitor details, status, raw results, and scored results.
- **Streaming:** Event schema for orchestrator-to-client updates (step boundaries, errors).
- **Agent handoffs:** Research → Scoring (per result, in isolation).

### Build order
1. **Base & Schema**
    - Setup Drizzle with SQLite.
    - Initial migrations for tables (No JSON columns).

2. **Orchestrator Skeleton**
    - Entry point to create a run.
    - Sequence stubbed agents and update status.

3. **Respan Foundation**
    - Initialize Respan SDK.
    - Instrument the orchestrator lifecycle.

4. **Research Agent**
    - Real LLM implementation using Google Search site-specific queries for all sources.
    - Instrument with Respan (Trace Group 1).

5. **Scoring Agent**
    - Real LLM implementation to assign score 1–10 and reasoning for each result.
    - Instrument with Respan (Trace Group 2).

6. **Streaming**
    - API path to emit execution events to the client.

7. **Running UI**
    - Trigger a run.
    - Live progress view driven by orchestrator events.

8. **Signal Feed UI**
    - Simple list of signal cards sorted by score.

---

## Phase 2: Intelligence & Memory

### Cross-cutting
- **Scoring Context:** Schema and query logic to retrieve recent results for a competitor to provide historical context to the Scoring Agent.
- **Synthesis Contract:** Input/Output shapes for the Synthesis Agent to receive all scored results and return a summary object.

### Build order
1. **Prior Signal History**
   - Update the Scoring Agent to include previous results for the competitor in its prompt.
   - Refine scoring logic to account for whether a signal is strategic or routine based on that history.
2. **Synthesis Agent**
   - Implement the agent that identifies patterns and corroboration across all scored results in a run.
   - Instrument as **Trace Group 3** in Respan.
3. **Direct Platform Integration**
   - Replace Google Search for GitHub with direct API access for repository signals.
   - Update the Research Agent to handle structured API data.

---

## Phase 3: UX & Advanced Patterns

### Cross-cutting
- **Annotation Schema:** UI state to mark corroborated signals identified by the Synthesis Agent.

### Build order
1. **Corroboration Highlights**
   - Update the Signal Feed to visually badge signals flagged as corroborated.
2. **Strategic Summary**
   - Add a Run Summary section displaying the Synthesis Agent's high-level takeover of the run.
3. **Feed Controls**
   - Add UI controls to filter the feed by signal type or score threshold.

---

## Phase 4: Persistence & Identity

### Cross-cutting
- **Postgres Schema:** Final migration set for Supabase including Row Level Security (RLS) policies.
- **Migration Logic:** Routine to transfer data from an anonymous session to an authenticated user account.

### Build order
1. **Supabase Migration**
   - Swap the Drizzle driver from SQLite to Postgres.
   - Deploy migrations to Supabase and verify RLS policies.
2. **Guest Sessions**
   - Implement the `guest_sessions` table and middleware for identity persistence.
3. **Supabase Auth**
   - Integrate registration and sign-in flows.
4. **Data Reassignment**
   - Implement the routine to reassign research data from the anonymous session to the authenticated account after login.
