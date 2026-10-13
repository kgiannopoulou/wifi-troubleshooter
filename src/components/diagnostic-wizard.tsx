"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api-client";

type NodeWithOptions = {
  node: { id: number; questionText: string };
  options: {
    id: number;
    label: string;
    nextNodeId: number | null;
    resolution: { id: number; title: string; fixSteps: string } | null;
  }[];
};

type HistoryEntry = { questionText: string; answerLabel: string };

export function DiagnosticWizard({
  modelSlug,
  modelName,
  symptomName,
  rootNodeId,
}: {
  modelSlug: string;
  modelName: string;
  symptomName: string;
  rootNodeId: number;
}) {
  const [currentNodeId, setCurrentNodeId] = useState(rootNodeId);
  const [current, setCurrent] = useState<NodeWithOptions | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [resolution, setResolution] = useState<{ title: string; fixSteps: string } | null>(null);
  // Bumped by Retry / Start over to re-run the fetch effect for the same node.
  const [attempt, setAttempt] = useState(0);
  // Outcome of the most recent fetch, tagged with which request it belongs
  // to. "Loading" is simply "no outcome yet for the current request", so a
  // failed fetch shows an error with Retry / Start over instead of leaving
  // "Loading..." on screen forever.
  const requestKey = `${currentNodeId}:${attempt}`;
  const [outcome, setOutcome] = useState<
    { key: string; error: { message: string; canRetry: boolean } | null } | null
  >(null);
  const loading = outcome?.key !== requestKey;
  const error = loading ? null : outcome.error;

  // Fetches the next question whenever the wizard moves forward. Doesn't
  // run once a resolution is reached — there's nothing further to fetch.
  useEffect(() => {
    if (resolution) return;
    // Ignore a slow response that arrives after the user has already moved
    // on (or retried), so it can't overwrite the newer question.
    let ignore = false;
    const key = `${currentNodeId}:${attempt}`;
    apiFetch<NodeWithOptions>(`/api/nodes/${currentNodeId}`)
      .then((data) => {
        if (ignore) return;
        setCurrent(data);
        setOutcome({ key, error: null });
      })
      .catch((err) => {
        if (ignore) return;
        setCurrent(null);
        setOutcome({
          key,
          error:
            err instanceof ApiError && err.status === 404
              ? // Retrying won't help: the question was removed or changed.
                {
                  message: "This step is no longer available — the guide may have just been updated.",
                  canRetry: false,
                }
              : {
                  message: "We couldn't load the next question. Check your connection and try again.",
                  canRetry: true,
                },
        });
      });
    return () => {
      ignore = true;
    };
  }, [currentNodeId, resolution, attempt]);

  function handleAnswer(option: NodeWithOptions["options"][number]) {
    if (!current) return;
    setHistory((prev) => [
      ...prev,
      { questionText: current.node.questionText, answerLabel: option.label },
    ]);
    if (option.resolution) {
      setResolution(option.resolution);
    } else if (option.nextNodeId) {
      setCurrentNodeId(option.nextNodeId);
    }
  }

  function startOver() {
    setHistory([]);
    setResolution(null);
    setCurrentNodeId(rootNodeId);
    // Re-fetch even if we're already on the root (e.g. the root itself
    // failed to load).
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/diagnose/${modelSlug}`} className="text-sm underline">
          &larr; Choose a different problem
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {modelName} &mdash; {symptomName}
        </h1>
      </div>

      {history.length > 0 && (
        <ol className="flex flex-col gap-1 border-l-2 border-black/10 pl-4 text-sm opacity-60 dark:border-white/10">
          {history.map((entry, i) => (
            <li key={i}>
              {entry.questionText} <span className="font-medium">&rarr; {entry.answerLabel}</span>
            </li>
          ))}
        </ol>
      )}

      {resolution ? (
        <div className="flex flex-col gap-4 rounded border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-lg font-semibold">{resolution.title}</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm opacity-80">
            {resolution.fixSteps}
          </pre>
          <button
            onClick={startOver}
            className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            Start over
          </button>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded border border-red-500/40 bg-red-500/5 p-4"
        >
          <p className="text-sm">{error.message}</p>
          <div className="flex gap-3">
            {error.canRetry && (
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
              >
                Retry
              </button>
            )}
            <button
              onClick={startOver}
              className="rounded border border-black/20 px-4 py-2 text-sm dark:border-white/20"
            >
              Start over
            </button>
          </div>
        </div>
      ) : loading || !current ? (
        <p>Loading...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">{current.node.questionText}</h2>
          <div className="flex flex-wrap gap-3">
            {current.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                className="rounded border border-black/20 px-4 py-2 hover:border-black/40 dark:border-white/20 dark:hover:border-white/40"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
