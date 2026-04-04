# Early Signal — Decision Log

A running record of significant decisions, pivots, and the reasoning behind them. Useful for build-in-public content and for reconstructing context when it drops out of memory.

---

## Domain Pivot: Acquisition Research to Competitor Monitoring

### What we decided
The primary research target shifted from micro-SaaS acquisition candidates to competitor monitoring for tech founders.

### Original direction
The system would search Reddit, IndieHackers, Hacker News, Twitter/X, and GitHub for founders showing pre-sale behavioral signals — burnout, going quiet, explicit exit intent — before they list on acquisition marketplaces like Acquire.com or Flippa.

### Why we pivoted
The acquisition research angle, while personally motivated and architecturally interesting, targets a niche within a niche. Founders who buy instead of build exist but are not the majority in tech. To reach the target audience — tech founders broadly — the problem needed to be more universal.

### Why not other options
Several alternatives were considered:

- **Market timing research** — rejected early, too speculative and hard to make concrete
- **Hiring signal research** — rejected as self-serving and less relevant in the current hiring market
- **Customer pain mining** — viable but founders who are good at this already have a workflow; those who aren't may not recognize the pain acutely enough to engage

### The case against Competitor Monitoring
Before committing, the argument against was stress-tested honestly:

- **Crowded space** — Crayon, Klue, Kompyte, Similarweb are established players with sales teams
- **Respan angle gets muddier** — competitor monitoring can be mechanical, making traces less interesting
- **Founders who don't do it won't start** — an agent doesn't change a philosophical resistance to reactive thinking
- **Not personally motivated** — no authentic origin story the way acquisition research had one
- **Signal definition is fuzzy** — "competitor signal" is vague, making scoring harder and output less crisp

### The steelmanned case for Competitor Monitoring

**On crowding:**
Existing tools are instrumentation, not reasoning. They detect *what* changed algorithmically but not *what it means* strategically. An agent can reason about the implication of a signal given everything else it knows about a competitor's trajectory. Crayon tells you a competitor updated their pricing page. This system tells you why that might matter. That is a different product category dressed in similar clothing.

**On Respan:**
The reasoning complexity makes observability more valuable, not less. When an agent makes judgment calls about signal significance — is this job posting a strategic pivot or routine hiring? — you genuinely need to see the reasoning to trust the output. That is a more compelling Respan demo than a mechanical scraper with traces. The harder the reasoning, the more useful the trace.

**On personal motivation:**
"I just wanted to build it" is underrated as a founder story. It signals taste and honest curiosity. The best tools get built by people who wanted the thing to exist. The build-in-public narrative doesn't require a personal origin story — it requires genuine curiosity about whether an agent can do something better than existing tools. That curiosity is real.

**On signal fuzziness:**
The fuzziness is a feature for the build-in-public series, not a bug. What counts as a meaningful competitor signal? How does the agent decide? When does it get it wrong? That's three posts right there. The hard problem is the story.

**The cross-cutting differentiator:**
The combination of reasoning plus observability is what no existing competitor monitoring tool offers. None of them show you *why* they flagged something. That's the novel angle and the reason Respan instrumentation is genuinely interesting here rather than just a portfolio checkbox.

### What stays the same
The core architecture is unchanged:
- Three agents with explicit handoffs (Research, Scoring, Synthesis)
- Same source list with Google as the universal search layer plus GitHub API
- Same data model
- Same Respan instrumentation strategy
- Same stack

What changes is the signal vocabulary — from burnout and exit intent to strategic competitor signals — and the scoring logic, which now reasons about business implication rather than founder psychology.

---

## Target Audience: Founders over Engineers

### What we decided
Posts and hooks are written for tech founders, not engineers.

### Reasoning
The build-in-public series has two goals: visibility and inbound. Engineers are already in the existing audience. Founders are the audience worth reaching — they recognize the competitor research pain personally, they make hiring decisions, and they're the most likely to share content that solves a problem they live with daily.

Hooks and framing should assume intelligence but not technical depth. The problem should be recognizable before the solution is explained.

---

## Hashtag Strategy

### Primary series tag
**#AgentsBuildingAgents** — the memorable, scroll-stopping tag. Implies the recursive quality of using agents to build agents. Slightly provocative.

### Secondary descriptive tag
**#BuildAgentsWithAgents** — more accurate to what's actually happening. You are the actor, agents are the tool. Used alongside the primary tag.

### Discovery tag
**#BuildInPublic** — standard discoverability. Connects the series to the broader build-in-public community.

### Rationale for the primary tag
The core distinction of this project is not "I used AI to build faster" — that's the common story. This is "I used AI to learn how AI systems work." The tag should encode that recursion. #AgentsBuildingAgents does that in three words.
