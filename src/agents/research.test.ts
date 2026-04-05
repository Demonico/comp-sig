import { describe, it, expect, vi } from "vitest";
import { sources, signalTypes } from "./research";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn(({ schema }: { schema: unknown }) => ({ schema })),
  },
  stepCountIs: vi.fn((n: number) => n),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: Object.assign(vi.fn(() => "mock-model"), {
    tools: {
      webSearch_20260209: vi.fn(() => "mock-web-search"),
    },
  }),
}));

describe("runResearchAgent", () => {
  it("returns valid ResearchResult[] from structured output", async () => {
    const mockResults = {
      results: [
        {
          source: "reddit" as const,
          url: "https://reddit.com/r/test/1",
          extractedText: "Competitor raised prices",
          signalType: "pricing" as const,
        },
        {
          source: "hackernews" as const,
          url: "https://news.ycombinator.com/item?id=1",
          extractedText: "New product launch announced",
          signalType: "product" as const,
        },
      ],
    };

    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValue({
      output: mockResults,
    } as Awaited<ReturnType<typeof generateText>>);

    const { runResearchAgent } = await import("./research");
    const results = await runResearchAgent({ competitorName: "TestCo" });

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(sources).toContain(result.source);
      expect(signalTypes).toContain(result.signalType);
      expect(result.url).toBeTruthy();
      expect(result.extractedText).toBeTruthy();
    }
  });

  it("throws when output is null", async () => {
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValue({
      output: null,
    } as Awaited<ReturnType<typeof generateText>>);

    const { runResearchAgent } = await import("./research");

    await expect(
      runResearchAgent({ competitorName: "TestCo" }),
    ).rejects.toThrow("Research agent returned no structured output");
  });
});
