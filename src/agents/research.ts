import { generateText, Output, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const sources = [
  "reddit",
  "hackernews",
  "twitter",
  "indiehackers",
  "github",
] as const;

export const signalTypes = [
  "product",
  "pricing",
  "positioning",
  "hiring",
  "partnership",
  "reputation",
  "corporate",
] as const;

export type Source = (typeof sources)[number];
export type SignalType = (typeof signalTypes)[number];

export type ResearchResult = {
  source: Source;
  url: string;
  extractedText: string;
  signalType: SignalType;
};

type ResearchInput = {
  competitorName: string;
  competitorUrl?: string;
};

const sourceDomains: Record<Source, string> = {
  reddit: "reddit.com",
  hackernews: "news.ycombinator.com",
  twitter: "twitter.com",
  indiehackers: "indiehackers.com",
  github: "github.com",
};

const outputSchema = z.object({
  results: z.array(
    z.object({
      source: z.enum(sources),
      url: z.string(),
      extractedText: z.string(),
      signalType: z.enum(signalTypes),
    }),
  ),
});

export async function runResearchAgent(
  input: ResearchInput,
): Promise<ResearchResult[]> {
  const competitorDesc = input.competitorUrl
    ? `${input.competitorName} (${input.competitorUrl})`
    : input.competitorName;

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    tools: {
      webSearch: anthropic.tools.webSearch_20260209({
        allowedDomains: Object.values(sourceDomains),
      }),
    },
    output: Output.object({ schema: outputSchema }),
    stopWhen: stepCountIs(12),
    system: `You are a competitive intelligence research agent. Your job is to find meaningful competitive signals about a company by searching across specific platforms.

For each platform, construct targeted search queries to find:
- Reddit (reddit.com): Customer complaints, comparisons, product discussions, sentiment
- Hacker News (news.ycombinator.com): Launch posts, founder comments, community reactions, technical discussions
- Twitter/X (twitter.com): Announcements, customer sentiment, founder messaging, product updates
- IndieHackers (indiehackers.com): Founder updates, product launches, positioning shifts, revenue milestones
- GitHub (github.com): New repos, commit activity, public roadmap signals, open source strategy

Search each platform for signals about the competitor. For each meaningful result you find, classify it into exactly one signal type:
- product: Anything shipped, announced, or changed in the product itself
- pricing: Changes to pricing, packaging, or plan structure
- positioning: Messaging changes, rebranding, new target market signals
- hiring: Job postings that reveal strategic direction
- partnership: Integrations, co-marketing, acquisitions, ecosystem moves
- reputation: What customers are saying about them in the wild
- corporate: Funding rounds, IPOs, leadership changes, legal events

Focus on recent, meaningful signals. Skip routine noise. Extract the key information from each result — what happened and why it matters.`,
    prompt: `Research competitive signals for: ${competitorDesc}

Search across all five platforms (Reddit, Hacker News, Twitter/X, IndieHackers, GitHub) for meaningful signals. Return your findings as structured results.`,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "research-agent",
    },
  });

  if (!output) {
    throw new Error("Research agent returned no structured output");
  }

  return output.results;
}
