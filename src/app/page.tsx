"use client";

import { useState } from "react";

type Result = {
  id: string;
  source: string;
  url: string;
  extractedText: string;
  signalType: string;
  score: number | null;
  reasoning: string | null;
};

type RunResponse = {
  runId: string;
  competitorId: string;
  competitorName: string;
  results: Result[];
};

export default function Home() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunResponse | null>(null);

  async function runResearch() {
    setLoading(true);
    setError(null);
    setRun(null);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setRun(data);
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runResearch();
  }

  const sortedResults = run?.results
    .slice()
    .sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

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
          disabled={loading}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? "Researching..." : "Run Research"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p>{error}</p>
          <button
            onClick={() => runResearch()}
            className="mt-2 text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {sortedResults && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">
            Signals for {run?.competitorName}
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {sortedResults.map((result) => (
              <SignalCard key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SignalCard({ result }: { result: Result }) {
  const scored = result.score !== null;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {result.signalType}
        </span>
        {scored ? (
          <span className="text-lg font-bold tabular-nums">{result.score}</span>
        ) : (
          <span className="text-xs text-zinc-400">scoring failed</span>
        )}
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
      {scored && result.reasoning && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {result.reasoning}
        </p>
      )}
    </div>
  );
}
