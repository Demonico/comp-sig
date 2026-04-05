export type ResearchResult = {
  source: "reddit" | "hackernews" | "twitter" | "indiehackers" | "github";
  url: string;
  extractedText: string;
  signalType:
    | "product"
    | "pricing"
    | "positioning"
    | "hiring"
    | "partnership"
    | "reputation"
    | "corporate";
};

type ResearchInput = {
  competitorName: string;
  competitorUrl?: string;
};

export async function runResearchAgent(
  input: ResearchInput,
): Promise<ResearchResult[]> {
  return [
    {
      source: "reddit",
      url: "https://reddit.com/r/saas/comments/example1",
      extractedText: `Users on r/saas discussing ${input.competitorName}'s recent pricing change from flat-rate to usage-based billing. Multiple comments mention switching to alternatives.`,
      signalType: "pricing",
    },
    {
      source: "hackernews",
      url: "https://news.ycombinator.com/item?id=example2",
      extractedText: `${input.competitorName} Show HN post announcing new API v2 with breaking changes. Comments discuss migration difficulty and missing features from v1.`,
      signalType: "product",
    },
    {
      source: "twitter",
      url: "https://twitter.com/example/status/example3",
      extractedText: `${input.competitorName} CEO tweeted about expanding into the enterprise segment, hiring a new VP of Sales from Salesforce.`,
      signalType: "hiring",
    },
    {
      source: "reddit",
      url: "https://reddit.com/r/devtools/comments/example4",
      extractedText: `Thread comparing ${input.competitorName} vs competitors. General sentiment is that ${input.competitorName} has better DX but worse reliability. Several users report recent outages.`,
      signalType: "reputation",
    },
    {
      source: "hackernews",
      url: "https://news.ycombinator.com/item?id=example5",
      extractedText: `Blog post from ${input.competitorName} about their new partnership with AWS for marketplace distribution. Comments speculate this signals a move toward enterprise.`,
      signalType: "partnership",
    },
  ];
}
