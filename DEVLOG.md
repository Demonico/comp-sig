# Dev Log — CompSig

A running log of development sessions, written to support future articles about this project.

---

## Rescoping Phase 1 and Setting Project Standards

*Saturday Apr 4, 2026, 11:54 PM — Session 2*

### What We Built

No application code yet, but we rewrote the foundation the code will sit on. We trimmed the Phase 1 spec down to a tighter scope, created a detailed implementation plan, added coding standards to `CLAUDE.md`, and set up a testing skill file for future use.

### How It Came Together

The session started with frustration — the previous session's plan had bad patterns in it (like making all components client components) and the scope was too ambitious. Rather than patch the old plan, we started fresh and walked through the spec section by section.

The key conversation was about what actually belongs in Phase 1 for a learning project. The original spec included streaming (SSE), Respan instrumentation, and implied real LLM calls — all on top of the database, orchestrator, and UI. We cut all three. Streaming doesn't make sense when stubbed agents return instantly. Respan doesn't teach much when there are no real LLM traces to observe. Both come back naturally when real agents arrive in Phase 2.

We also settled the server action vs route handler question. Server actions can't stream responses, which makes them unsuitable for the orchestrator even in later phases. Route handler was the only viable option.

We ported coding standards from another project (Idea Autopsy) into this one — generic versions in `CLAUDE.md` for always-on rules, and a `/testing` skill for test-specific conventions that only need to load when writing tests. This came out of a discussion about Claude Code's lack of file-glob scoped rules — unlike Cursor, everything is either always loaded or manually invoked.

### The Interesting Parts

The decision to keep the orchestrator as plain application code rather than an agent was worth the discussion. For a linear pipeline (research → score → done), an LLM call to decide "what's next" is just an expensive for-loop. But the door stays open — if Phase 2's synthesis agent makes the flow adaptive, we can revisit.

### What's Next

Implementation starts: Drizzle + SQLite schema, stubbed agents, orchestrator route handler, and a basic UI. All with hardcoded data, no external calls.

---

## Planning the Core Pipeline and the Agentic Future

*Friday Apr 3, 2026, 10:30 PM — Session 1*

### What We Built

We established the architectural foundation and a phased build order for CompSig. This included a detailed four-phase
roadmap in `BUILD_ORDER.md` and strict database constraints in `AGENTS.md` and `CLAUDE.md` to ensure a relational
structure over flexible JSON columns.

### How It Came Together

The session was a deep dive into how to slice an agentic application for both learning and delivery. We pivoted from a
complex, Supabase-first setup to a leaner stack—Next.js with Drizzle and SQLite—to get the "Research → Score" pipeline
functional without the overhead of auth or remote database management. This "local-first" approach is a deliberate move
to isolate the core value: the agent reasoning and the Respan traces. While we might move the Supabase transition up if
we decide to deploy sooner, we agreed that Phase 1 already has significant scope and deserves a tight focus.

### The Interesting Parts

The most significant technical decision was the ban on JSON columns in the database. In a SaaS context, we might have
kept raw source metadata in a JSON blob for later reprocessing, but for this project, we’re choosing to "normalize at
the edge." The Research Agent will be responsible for extracting only the universal signal fields we care about. This
avoids the "pattern debt" and maintenance headaches that often come with JSON-in-SQL, forcing a cleaner relational model
from day one.

We also synchronized on the role of Respan. Rather than instrumenting stubbed agents, we’ll introduce the observability
layer exactly when we transition to real LLM calls. This ensures we're learning to use Respan as a primary debugging
tool for reasoning and tool-calling, rather than just as a post-hoc monitoring layer.

### What's Next

We're ready to start Phase 1: setting up the Drizzle schema and the Orchestrator skeleton. The first real hurdle will be
building the Research Agent's Google Search integration and seeing those first raw signals flow into the SQLite store.
