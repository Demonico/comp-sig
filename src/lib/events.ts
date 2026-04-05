export type RunEvent =
  | { type: "run-started"; runId: string; competitorName: string }
  | { type: "research-complete"; resultCount: number }
  | {
      type: "result-scored";
      resultId: string;
      signalType: string;
      score: number;
      reasoning: string;
      source: string;
      url: string;
      extractedText: string;
    }
  | { type: "scoring-failed"; resultId: string }
  | { type: "run-complete"; runId: string }
  | { type: "run-failed"; error: string };

export function encodeEvent(event: RunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function parseEvent(data: string): RunEvent {
  return JSON.parse(data) as RunEvent;
}
