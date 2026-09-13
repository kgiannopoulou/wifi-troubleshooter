"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

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
  const [loading, setLoading] = useState(true);

  // Fetches the next question whenever the wizard moves forward. Doesn't
  // run once a resolution is reached — there's nothing further to fetch.
  useEffect(() => {
    if (resolution) return;
    setLoading(true);
    apiFetch<NodeWithOptions>(`/api/nodes/${currentNodeId}`)
      .then(setCurrent)
      .finally(() => setLoading(false));
  }, [currentNodeId, resolution]);

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
