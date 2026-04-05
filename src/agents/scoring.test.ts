import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn(({ schema }: { schema: unknown }) => ({ schema })),
  },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      searchRuns: {
        findMany: vi.fn(),
      },
      researchResults: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock("@/db/schema", () => ({
  researchResults: { score: "score", reasoning: "reasoning" },
  searchRuns: { competitorId: "competitor_id", status: "status" },
}));

describe("runScoringAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid ScoringOutput with score in 1-10 range", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.query.searchRuns.findMany).mockResolvedValue([]);

    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValue({
      output: { score: 7, reasoning: "Strong signal indicating strategic shift" },
    } as Awaited<ReturnType<typeof generateText>>);

    const { runScoringAgent } = await import("./scoring");
    const result = await runScoringAgent({
      competitorName: "TestCo",
      competitorId: "comp-1",
      result: {
        source: "reddit",
        url: "https://reddit.com/r/test/1",
        extractedText: "Pricing model changed",
        signalType: "pricing",
      },
    });

    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.reasoning).toBeTruthy();
  });

  it("throws when output is null", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.query.searchRuns.findMany).mockResolvedValue([]);

    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValue({
      output: null,
    } as Awaited<ReturnType<typeof generateText>>);

    const { runScoringAgent } = await import("./scoring");

    await expect(
      runScoringAgent({
        competitorName: "TestCo",
        competitorId: "comp-1",
        result: {
          source: "reddit",
          url: "https://reddit.com/r/test/1",
          extractedText: "Pricing model changed",
          signalType: "pricing",
        },
      }),
    ).rejects.toThrow("Scoring agent returned no structured output");
  });

  it("includes prior signals in the prompt when they exist", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.query.searchRuns.findMany).mockResolvedValue([
      { id: "run-old", competitorId: "comp-1", status: "complete", createdAt: 1000, completedAt: 1100, errorMessage: null },
    ]);
    vi.mocked(db.query.researchResults.findMany).mockResolvedValue([
      {
        id: "res-old",
        runId: "run-old",
        source: "hackernews",
        url: "https://hn.com/1",
        extractedText: "Series B announced",
        signalType: "corporate",
        score: 9,
        reasoning: "Major funding event",
        createdAt: 1000,
      },
    ]);

    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValue({
      output: { score: 8, reasoning: "Hiring spike after funding" },
    } as Awaited<ReturnType<typeof generateText>>);

    const { runScoringAgent } = await import("./scoring");
    await runScoringAgent({
      competitorName: "TestCo",
      competitorId: "comp-1",
      result: {
        source: "twitter",
        url: "https://twitter.com/test/1",
        extractedText: "Hiring 20 engineers",
        signalType: "hiring",
      },
    });

    const call = vi.mocked(generateText).mock.calls[0][0];
    expect(call.prompt).toContain("Prior signals");
    expect(call.prompt).toContain("Series B announced");
  });

  it("handles no prior history gracefully", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.query.searchRuns.findMany).mockResolvedValue([]);

    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValue({
      output: { score: 5, reasoning: "Moderate signal" },
    } as Awaited<ReturnType<typeof generateText>>);

    const { runScoringAgent } = await import("./scoring");
    await runScoringAgent({
      competitorName: "TestCo",
      competitorId: "comp-1",
      result: {
        source: "reddit",
        url: "https://reddit.com/r/test/1",
        extractedText: "Some discussion",
        signalType: "reputation",
      },
    });

    const call = vi.mocked(generateText).mock.calls[0][0];
    expect(call.prompt).toContain("No prior signals exist");
  });
});
