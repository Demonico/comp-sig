import { runResearchAgent } from "@/agents/research";
import { runScoringAgent } from "@/agents/scoring";
import { db } from "@/db";
import { competitors, researchResults, searchRuns } from "@/db/schema";
import { encodeEvent } from "@/lib/events";
import { createId } from "@paralleldrive/cuid2";
import { propagateAttributes, withTask, withWorkflow } from "@respan/respan";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url } = body as { name: string; url?: string };

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const runId = createId();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Parameters<typeof encodeEvent>[0]) => {
        controller.enqueue(new TextEncoder().encode(encodeEvent(event)));
      };

      try {
        await propagateAttributes(
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

              send({ type: "run-started", runId, competitorName: name.trim() });

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

              send({ type: "research-complete", resultCount: results.length });

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
                            r.url === row.url &&
                            r.signalType === row.signalType,
                        );
                        if (!original) return;

                        const scored = await runScoringAgent({
                          competitorName: name.trim(),
                          competitorId,
                          result: original,
                        });

                        await db
                          .update(researchResults)
                          .set({
                            score: scored.score,
                            reasoning: scored.reasoning,
                          })
                          .where(eq(researchResults.id, row.id));

                        send({
                          type: "result-scored",
                          resultId: row.id,
                          signalType: row.signalType,
                          score: scored.score,
                          reasoning: scored.reasoning,
                          source: row.source,
                          url: row.url,
                          extractedText: row.extractedText,
                        });
                      });
                    } catch {
                      failures++;
                      send({
                        type: "scoring-failed",
                        resultId: row.id,
                      });
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

                send({
                  type: "run-failed",
                  error: "All scoring calls failed",
                });
                return;
              }

              // Mark run complete
              await db
                .update(searchRuns)
                .set({ status: "complete", completedAt: Date.now() })
                .where(eq(searchRuns.id, runId));

              send({ type: "run-complete", runId });
            }),
        );
      } catch (error) {
        send({
          type: "run-failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
