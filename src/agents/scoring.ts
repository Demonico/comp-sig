import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/db";
import { researchResults, searchRuns } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import type { ResearchResult } from "./research";

export type ScoringInput = {
  competitorName: string;
  competitorId: string;
  result: ResearchResult;
};

export type ScoringOutput = {
  score: number;
  reasoning: string;
};

const outputSchema = z.object({
  score: z.number().int().min(1).max(10),
  reasoning: z.string(),
});

export async function runScoringAgent(
  input: ScoringInput,
): Promise<ScoringOutput> {
  const priorSignals = await getPriorSignals(input.competitorId);

  const priorContext =
    priorSignals.length > 0
      ? `\n\nPrior signals for this competitor (from previous research runs):\n${priorSignals
          .map(
            (s) =>
              `- [${s.signalType}] (score: ${s.score}/10) ${s.extractedText} — Reasoning: ${s.reasoning}`,
          )
          .join("\n")}`
      : "\n\nNo prior signals exist for this competitor. This is the first research run.";

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    output: Output.object({ schema: outputSchema }),
    system: `You are a competitive intelligence scoring agent. You evaluate individual research results and assign a significance score from 1 to 10 with explicit reasoning.

Scoring criteria:
- 1-3: Routine or low-impact signal (normal hiring, minor updates, routine mentions)
- 4-6: Moderate signal worth tracking (notable product changes, sentiment shifts, mid-level hires)
- 7-9: High-impact strategic signal (pricing model changes, major partnerships, executive hires signaling pivots)
- 10: Critical competitive event (acquisition, major pivot, existential threat)

When prior signals exist for this competitor, use them to inform your scoring:
- A signal that corroborates or amplifies a prior signal is more significant
- A signal that contradicts a prior pattern is worth noting
- Repeated routine signals should score lower over time
- A hiring signal after a funding signal means something different than hiring in isolation

Your reasoning should be specific and reference the evidence. Explain WHY this score, not just WHAT the signal is.`,
    prompt: `Score this research result for ${input.competitorName}:

Source: ${input.result.source}
URL: ${input.result.url}
Signal Type: ${input.result.signalType}
Content: ${input.result.extractedText}${priorContext}`,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "scoring-agent",
    },
  });

  if (!output) {
    throw new Error("Scoring agent returned no structured output");
  }

  return output;
}

async function getPriorSignals(competitorId: string) {
  const priorRuns = await db.query.searchRuns.findMany({
    where: and(
      eq(searchRuns.competitorId, competitorId),
      eq(searchRuns.status, "complete"),
    ),
    orderBy: (runs, { desc }) => [desc(runs.createdAt)],
    limit: 5,
  });

  if (priorRuns.length === 0) return [];

  const runIds = priorRuns.map((r) => r.id);

  const results = await db.query.researchResults.findMany({
    where: and(
      isNotNull(researchResults.score),
      isNotNull(researchResults.reasoning),
    ),
  });

  return results
    .filter((r) => runIds.includes(r.runId))
    .map((r) => ({
      signalType: r.signalType,
      score: r.score as number,
      extractedText: r.extractedText,
      reasoning: r.reasoning as string,
    }));
}
