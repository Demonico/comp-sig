"use client";

import type { RunEvent } from "@/lib/events";
import React, { useCallback, useState } from "react";

type ScoredResult = {
  resultId: string;
  source: string;
  url: string;
  extractedText: string;
  signalType: string;
  score: number;
  reasoning: string;
};

type RunState =
  | { status: "idle" }
  | { status: "researching"; competitorName: string }
  | {
      status: "scoring";
      competitorName: string;
      resultCount: number;
      results: ScoredResult[];
      failedIds: string[];
    }
  | {
      status: "complete";
      competitorName: string;
      results: ScoredResult[];
      failedIds: string[];
    }
  | { status: "error"; message: string };

export default function Home() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [run, setRun] = useState<RunState>({ status: "idle" });

  function handleEvent(event: RunEvent) {
    switch (event.type) {
      case "research-complete":
        setRun((prev) => {
          if (prev.status !== "researching") return prev;
          return {
            status: "scoring",
            competitorName: prev.competitorName,
            resultCount: event.resultCount,
            results: [],
            failedIds: [],
          };
        });
        break;

      case "result-scored":
        setRun((prev) => {
          if (prev.status !== "scoring") return prev;
          return {
            ...prev,
            results: [
              ...prev.results,
              {
                resultId: event.resultId,
                source: event.source,
                url: event.url,
                extractedText: event.extractedText,
                signalType: event.signalType,
                score: event.score,
                reasoning: event.reasoning,
              },
            ],
          };
        });
        break;

      case "scoring-failed":
        setRun((prev) => {
          if (prev.status !== "scoring") return prev;
          return {
            ...prev,
            failedIds: [...prev.failedIds, event.resultId],
          };
        });
        break;

      case "run-complete":
        setRun((prev) => {
          if (prev.status !== "scoring") return prev;
          return {
            status: "complete",
            competitorName: prev.competitorName,
            results: prev.results,
            failedIds: prev.failedIds,
          };
        });
        break;

      case "run-failed":
        setRun({ status: "error", message: event.error });
        break;
    }
  }

  const runResearch = useCallback(async () => {
    setRun({ status: "researching", competitorName: name.trim() });

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setRun({ status: "error", message: "Failed to start research run" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;

          const event: RunEvent = JSON.parse(dataLine.slice(6));
          handleEvent(event);
        }
      }
    } catch {
      setRun({ status: "error", message: "Failed to connect to the server" });
    }
  }, [name, url]);

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    void runResearch();
  };

  const isRunning = run.status === "researching" || run.status === "scoring";

  const results =
    run.status === "scoring" || run.status === "complete"
      ? run.results.slice().sort((a, b) => b.score - a.score)
      : [];

  const competitorName =
    run.status !== "idle" && run.status !== "error" ? run.competitorName : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">CompSig</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Research a competitor and surface scored signals.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Competitor name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Linear"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
        </div>
        <div>
          <label htmlFor="url" className="block text-sm font-medium">
            URL <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linear.app"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
        </div>
        <button
          type="submit"
          disabled={isRunning}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isRunning ? "Researching..." : "Run Research"}
        </button>
      </form>

      {run.status === "error" && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p>{run.message}</p>
          <button
            onClick={() => runResearch()}
            className="mt-2 text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {run.status === "researching" && (
        <div className="mt-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Searching for signals across Reddit, Hacker News, Twitter/X,
            IndieHackers, and GitHub...
          </p>
        </div>
      )}

      {(run.status === "scoring" || run.status === "complete") && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              Signals for {competitorName}
            </h2>
            {run.status === "scoring" && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Scoring results... ({run.results.length + run.failedIds.length}/
                {run.resultCount})
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {results.map((result) => (
              <SignalCard key={result.resultId} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SignalCard({ result }: { result: ScoredResult }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {result.signalType}
        </span>
        <span className="text-lg font-bold tabular-nums">{result.score}</span>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {result.source}
        </a>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {result.extractedText}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {result.reasoning}
      </p>
    </div>
  );
}
