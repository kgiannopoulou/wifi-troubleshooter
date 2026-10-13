"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

type TreeNode = {
  id: number;
  questionText: string;
  depth: number;
  isRoot: boolean;
  unreachable: boolean;
  options: {
    label: string;
    leadsTo: { type: "question"; nodeId: number } | { type: "resolution"; title: string | null };
  }[];
};

// Renders the depth-first walk from GET /api/admin/tree — see that route
// for why a recursive CTE (rather than the flat /api/admin/nodes list) is
// what makes this read in the same order a user actually experiences the
// wizard.
export function TreeOutline({ routerModelId, symptomId }: { routerModelId: number; symptomId: number }) {
  const [nodes, setNodes] = useState<TreeNode[] | null>(null);
  const [hasRoot, setHasRoot] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State is only set from the promise callbacks, so this is safe to call
  // straight from the effect below.
  const load = useCallback(() => {
    apiFetch<{ nodes: TreeNode[]; hasRoot: boolean }>(
      `/api/admin/tree?routerModelId=${routerModelId}&symptomId=${symptomId}`
    )
      .then((data) => {
        setNodes(data.nodes);
        setHasRoot(data.hasRoot);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load the tree"));
  }, [routerModelId, symptomId]);

  useEffect(load, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this question?")) return;
    try {
      await apiFetch(`/api/admin/nodes/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleMakeRoot(id: number) {
    try {
      await apiFetch(`/api/admin/nodes/${id}/root`, { method: "POST" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not change the starting question");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tree outline</h1>
        <Link
          href={`/admin/trees/${routerModelId}/${symptomId}/nodes/new`}
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          + Add question
        </Link>
      </div>

      {loadError ? (
        <div className="flex items-center gap-3 text-sm">
          <p className="text-red-600">{loadError}</p>
          <button onClick={load} className="underline">
            Retry
          </button>
        </div>
      ) : nodes === null ? (
        <p>Loading...</p>
      ) : nodes.length === 0 ? (
        <p className="opacity-70">
          No questions yet for this model + symptom. Add the first one to make it the root.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {!hasRoot && (
            <p className="rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              This tree has no starting question, so it isn&apos;t shown to users. Use
              &ldquo;Make starting question&rdquo; on one of the questions below.
            </p>
          )}
          {nodes.map((node, index) => (
            <div
              key={`${node.id}-${index}`}
              style={{ marginLeft: node.depth * 24 }}
              className="flex flex-col gap-2 rounded border border-black/10 p-3 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {node.questionText}
                  {node.isRoot && (
                    <span className="ml-2 text-xs font-normal opacity-60">(starting question)</span>
                  )}
                  {node.unreachable && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      (not reachable from the starting question)
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 gap-3 text-sm">
                  {!node.isRoot && (
                    <button onClick={() => handleMakeRoot(node.id)} className="underline">
                      Make starting question
                    </button>
                  )}
                  <Link
                    href={`/admin/trees/${routerModelId}/${symptomId}/nodes/${node.id}/edit`}
                    className="underline"
                  >
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(node.id)} className="underline">
                    Delete
                  </button>
                </span>
              </div>
              <ul className="flex flex-col gap-1 text-sm opacity-70">
                {node.options.map((opt, i) => (
                  <li key={i}>
                    &ldquo;{opt.label}&rdquo; &rarr;{" "}
                    {opt.leadsTo.type === "resolution"
                      ? `Resolution: ${opt.leadsTo.title}`
                      : "another question below"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
