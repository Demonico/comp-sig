import { db } from "@/db";
import { competitors, searchRuns, researchResults } from "@/db/schema";
import { runResearchAgent } from "@/agents/research";
import { runScoringAgent } from "@/agents/scoring";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { withWorkflow, withTask, propagateAttributes } from "@respan/respan";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url } = body as { name: string; url?: string };

  if (!name || typeof name !== "string") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const runId = createId();

  try {
    return await propagateAttributes(
      {
        customer_identifier: name.trim(),
        thread_identifier: runId,
      },
      () =>
        withWorkflow({ name: "competitor-research-run" }, async () => {
          // Find or create competitor (dedupe by name, case-insensitive)
          const existingCompetitor = await db.query.competitors.findFirst({
            where: (c, { sql }) =>
              sql`lower(${c.name}) = lower(${name.trim()})`,
          });

          const competitorId = existingCompetitor?.id ?? createId();

          if (!existingCompetitor) {
            await db.insert(competitors).values({
              id: competitorId,
              name: name.trim(),
              url: url?.trim() || null,
              createdAt: Date.now(),
            });
          }

          // Create search run
          await db.insert(searchRuns).values({
            id: runId,
            competitorId,
            status: "running",
            createdAt: Date.now(),
          });

          // Run research agent
          const results = await withTask({ name: "research" }, () =>
            runResearchAgent({
              competitorName: name.trim(),
              competitorUrl: url?.trim(),
            }),
          );

          // Insert research results
          const resultRows = results.map((r) => ({
            id: createId(),
            runId,
            source: r.source,
            url: r.url,
            extractedText: r.extractedText,
            signalType: r.signalType,
            createdAt: Date.now(),
          }));

          for (const row of resultRows) {
            await db.insert(researchResults).values(row);
          }

          // Score each result
          const scoringFailures = await withTask(
            { name: "scoring" },
            async () => {
              let failures = 0;

              for (const row of resultRows) {
                try {
                  await withTask({ name: "score-result" }, async () => {
                    const original = results.find(
                      (r) =>
                        r.url === row.url && r.signalType === row.signalType,
                    );
                    if (!original) return;

                    const scored = await runScoringAgent({
                      competitorName: name.trim(),
                      result: original,
                    });

                    await db
                      .update(researchResults)
                      .set({
                        score: scored.score,
                        reasoning: scored.reasoning,
                      })
                      .where(eq(researchResults.id, row.id));
                  });
                } catch {
                  failures++;
                }
              }

              return failures;
            },
          );

          // If all scoring failed, mark run as failed
          if (
            scoringFailures === resultRows.length &&
            resultRows.length > 0
          ) {
            await db
              .update(searchRuns)
              .set({
                status: "failed",
                errorMessage: "All scoring calls failed",
                completedAt: Date.now(),
              })
              .where(eq(searchRuns.id, runId));

            return Response.json(
              { error: "All scoring calls failed" },
              { status: 500 },
            );
          }

          // Mark run complete
          await db
            .update(searchRuns)
            .set({ status: "complete", completedAt: Date.now() })
            .where(eq(searchRuns.id, runId));

          // Return completed run data
          const completedResults = await db.query.researchResults.findMany({
            where: (r, { eq: e }) => e(r.runId, runId),
          });

          return Response.json({
            runId,
            competitorId,
            competitorName: name.trim(),
            results: completedResults,
          });
        }),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
