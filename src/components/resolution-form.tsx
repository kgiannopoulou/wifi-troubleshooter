"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export type Resolution = { id: number; title: string; fixSteps: string };

export function ResolutionForm({ resolution }: { resolution?: Resolution }) {
  const router = useRouter();
  const [title, setTitle] = useState(resolution?.title ?? "");
  const [fixSteps, setFixSteps] = useState(resolution?.fixSteps ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = { title, fixSteps };
      if (resolution) {
        await apiFetch(`/api/admin/resolutions/${resolution.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/admin/resolutions", { method: "POST", body: JSON.stringify(body) });
      }
      router.push("/admin/resolutions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{resolution ? "Edit resolution" : "New resolution"}</h1>
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Restart the router"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Fix steps</span>
          <textarea
            required
            rows={6}
            value={fixSteps}
            onChange={(e) => setFixSteps(e.target.value)}
            placeholder="1. ...&#10;2. ...&#10;3. ..."
            className="rounded border border-black/20 px-3 py-2 font-sans dark:border-white/20"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {resolution ? "Save changes" : "Create"}
        </button>
      </form>
    </div>
  );
}
