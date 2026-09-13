"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type Item = { id: number; name: string };

export function TreePicker() {
  const router = useRouter();
  const [models, setModels] = useState<Item[]>([]);
  const [symptoms, setSymptoms] = useState<Item[]>([]);
  const [modelId, setModelId] = useState<number | "">("");
  const [symptomId, setSymptomId] = useState<number | "">("");

  useEffect(() => {
    apiFetch<{ models: Item[] }>("/api/admin/models").then((data) => setModels(data.models));
    apiFetch<{ symptoms: Item[] }>("/api/admin/symptoms").then((data) =>
      setSymptoms(data.symptoms)
    );
  }, []);

  function view() {
    if (!modelId || !symptomId) return;
    router.push(`/admin/trees/${modelId}/${symptomId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Diagnostic trees</h1>
      <p className="opacity-70">
        Pick a router model and a symptom to view or build its diagnostic tree.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Router model</span>
          <select
            value={modelId}
            onChange={(e) => setModelId(Number(e.target.value))}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="">Choose...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Symptom</span>
          <select
            value={symptomId}
            onChange={(e) => setSymptomId(Number(e.target.value))}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="">Choose...</option>
            {symptoms.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={view}
          disabled={!modelId || !symptomId}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          View tree
        </button>
      </div>
    </div>
  );
}
