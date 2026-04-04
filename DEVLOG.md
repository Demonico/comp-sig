# Dev Log — CompSig

A running log of development sessions, written to support future articles about this project.

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
