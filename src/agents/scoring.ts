import type { ResearchResult } from "./research";

export type ScoringInput = {
  competitorName: string;
  result: ResearchResult;
};

export type ScoringOutput = {
  score: number;
  reasoning: string;
};

const stubScores: Record<string, ScoringOutput> = {
  pricing: {
    score: 8,
    reasoning:
      "Confirmed pricing model change with multiple user reports of switching. High business impact — directly affects competitive positioning and churn.",
  },
  product: {
    score: 7,
    reasoning:
      "Major API version change with breaking changes. Indicates active development but migration friction could drive users to alternatives.",
  },
  hiring: {
    score: 6,
    reasoning:
      "Executive hire from a major enterprise company signals strategic direction shift. Moderate confidence — single source but from company leadership.",
  },
  reputation: {
    score: 5,
    reasoning:
      "Mixed sentiment with reliability concerns. Useful directional signal but based on anecdotal reports rather than confirmed incidents.",
  },
  partnership: {
    score: 7,
    reasoning:
      "Official partnership announcement with a major cloud provider. Strong signal of enterprise positioning and distribution strategy shift.",
  },
};

export async function runScoringAgent(
  input: ScoringInput,
): Promise<ScoringOutput> {
  return (
    stubScores[input.result.signalType] ?? {
      score: 5,
      reasoning: "Default score for unrecognized signal type.",
    }
  );
}
