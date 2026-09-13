"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type ExistingNode = { id: number; questionText: string };
type ExistingResolution = { id: number; title: string };

type OptionDraft = {
  label: string;
  targetType: "node" | "resolution" | "";
  targetId: number | "";
};

export type EditableNode = {
  id: number;
  questionText: string;
  options: { label: string; nextNodeId: number | null; resolutionId: number | null }[];
};

function emptyOption(): OptionDraft {
  return { label: "", targetType: "", targetId: "" };
}

// Handles both creating a new question node and editing an existing one.
// The tricky part isn't the form fields themselves — it's that each option
// must link to EXACTLY one target (another question in this same tree, or
// a resolution), matching the node_options_exactly_one_target CHECK
// constraint in the database (see 0001_init.sql).
export function NodeForm({
  routerModelId,
  symptomId,
  node,
  backHref,
}: {
  routerModelId: number;
  symptomId: number;
  node?: EditableNode;
  backHref: string;
}) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState(node?.questionText ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(
    node
      ? node.options.map((o) => ({
          label: o.label,
          targetType: o.nextNodeId ? "node" : "resolution",
          targetId: (o.nextNodeId ?? o.resolutionId) as number,
        }))
      : [emptyOption(), emptyOption()]
  );
  const [existingNodes, setExistingNodes] = useState<ExistingNode[]>([]);
  const [existingResolutions, setExistingResolutions] = useState<ExistingResolution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ nodes: { id: number; questionText: string }[] }>(
      `/api/admin/nodes?routerModelId=${routerModelId}&symptomId=${symptomId}`
    ).then((data) =>
      setExistingNodes(data.nodes.filter((n) => n.id !== node?.id).map((n) => n))
    );
    apiFetch<{ resolutions: ExistingResolution[] }>("/api/admin/resolutions").then((data) =>
      setExistingResolutions(data.resolutions)
    );
  }, [routerModelId, symptomId, node?.id]);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (options.some((o) => !o.label || !o.targetType || o.targetId === "")) {
      setError("Every option needs a label and a target (question or resolution).");
      return;
    }

    setSubmitting(true);
    const payload = {
      questionText,
      options: options.map((o) => ({
        label: o.label,
        ...(o.targetType === "node"
          ? { nextNodeId: Number(o.targetId) }
          : { resolutionId: Number(o.targetId) }),
      })),
    };

    try {
      if (node) {
        await apiFetch(`/api/admin/nodes/${node.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/nodes", {
          method: "POST",
          body: JSON.stringify({ routerModelId, symptomId, ...payload }),
        });
      }
      router.push(backHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="text-sm">Question</span>
        <input
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="e.g. Is the power LED lit?"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-sm">Answer options</span>
        {options.map((option, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded border border-black/10 p-3 dark:border-white/10"
          >
            <div className="flex gap-2">
              <input
                required
                value={option.label}
                onChange={(e) => updateOption(index, { label: e.target.value })}
                placeholder="Answer label, e.g. Yes"
                className="flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/20"
              />
              {options.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="text-sm underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={option.targetType}
                onChange={(e) =>
                  updateOption(index, {
                    targetType: e.target.value as OptionDraft["targetType"],
                    targetId: "",
                  })
                }
                className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
              >
                <option value="">Leads to...</option>
                <option value="node">Another question</option>
                <option value="resolution">A resolution</option>
              </select>
              {option.targetType === "node" && (
                <select
                  value={option.targetId}
                  onChange={(e) => updateOption(index, { targetId: Number(e.target.value) })}
                  className="flex-1 rounded border border-black/20 px-2 py-1 dark:border-white/20"
                >
                  <option value="">Choose a question...</option>
                  {existingNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.questionText}
                    </option>
                  ))}
                </select>
              )}
              {option.targetType === "resolution" && (
                <select
                  value={option.targetId}
                  onChange={(e) => updateOption(index, { targetId: Number(e.target.value) })}
                  className="flex-1 rounded border border-black/20 px-2 py-1 dark:border-white/20"
                >
                  <option value="">Choose a resolution...</option>
                  {existingResolutions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addOption} className="self-start text-sm underline">
          + Add option
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {node ? "Save changes" : "Create question"}
      </button>
    </form>
  );
}
