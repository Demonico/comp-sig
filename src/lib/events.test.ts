import { describe, it, expect } from "vitest";
import { encodeEvent, parseEvent, type RunEvent } from "./events";

describe("encodeEvent", () => {
  it("serializes an event as an SSE data line", () => {
    const event: RunEvent = {
      type: "run-started",
      runId: "abc",
      competitorName: "Acme",
    };
    const encoded = encodeEvent(event);
    expect(encoded).toBe(
      `data: ${JSON.stringify(event)}\n\n`,
    );
  });
});

describe("parseEvent", () => {
  it("deserializes a JSON string into a RunEvent", () => {
    const event: RunEvent = {
      type: "run-complete",
      runId: "abc",
    };
    const parsed = parseEvent(JSON.stringify(event));
    expect(parsed).toEqual(event);
  });
});

describe("round-trip", () => {
  const events: RunEvent[] = [
    { type: "run-started", runId: "r1", competitorName: "Acme" },
    { type: "research-complete", resultCount: 5 },
    {
      type: "result-scored",
      resultId: "res1",
      signalType: "pricing",
      score: 8,
      reasoning: "Major pricing change",
      source: "reddit",
      url: "https://reddit.com/r/test",
      extractedText: "Price went up",
    },
    { type: "scoring-failed", resultId: "res2" },
    { type: "run-complete", runId: "r1" },
    { type: "run-failed", error: "Something broke" },
  ];

  for (const event of events) {
    it(`round-trips ${event.type}`, () => {
      const encoded = encodeEvent(event);
      const dataStr = encoded.replace("data: ", "").trim();
      const parsed = parseEvent(dataStr);
      expect(parsed).toEqual(event);
    });
  }
});
