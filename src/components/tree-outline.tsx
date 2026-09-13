"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

type TreeNode = {
  id: number;
  questionText: string;
  depth: number;
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

  function load() {
    apiFetch<{ nodes: TreeNode[] }>(
      `/api/admin/tree?routerModelId=${routerModelId}&symptomId=${symptomId}`
    ).then((data) => setNodes(data.nodes));
  }

  useEffect(load, [routerModelId, symptomId]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this question?")) return;
    try {
      await apiFetch(`/api/admin/nodes/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
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

      {nodes === null ? (
        <p>Loading...</p>
      ) : nodes.length === 0 ? (
        <p className="opacity-70">
          No questions yet for this model + symptom. Add the first one to make it the root.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              style={{ marginLeft: node.depth * 24 }}
              className="flex flex-col gap-2 rounded border border-black/10 p-3 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{node.questionText}</span>
                <span className="flex shrink-0 gap-3 text-sm">
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
