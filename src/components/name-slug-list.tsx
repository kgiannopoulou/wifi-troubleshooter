"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

type Item = { id: number; name: string; slug: string };

// Reused for both router models and symptom categories admin
// screens — the two entities are identical in shape (name + slug), so one
// list component (and one form component, see name-slug-form.tsx) covers
// both instead of four near-duplicate files.
export function NameSlugList({
  apiBase,
  listKey,
  title,
  newHref,
  editHrefBase,
}: {
  apiBase: string;
  listKey: string;
  title: string;
  newHref: string;
  editHrefBase: string;
}) {
  const [items, setItems] = useState<Item[] | null>(null);

  function load() {
    apiFetch<Record<string, Item[]>>(apiBase).then((data) => setItems(data[listKey]));
  }

  useEffect(load, [apiBase, listKey]);

  async function handleDelete(id: number) {
    if (!confirm(`Delete this ${title.toLowerCase().replace(/s$/, "")}?`)) return;
    try {
      await apiFetch(`${apiBase}/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Link
          href={newHref}
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          New
        </Link>
      </div>
      {items === null ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="opacity-70">Nothing here yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="py-2">Name</th>
              <th className="py-2">Slug</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2">{item.name}</td>
                <td className="py-2 opacity-60">{item.slug}</td>
                <td className="flex gap-3 py-2">
                  <Link href={`${editHrefBase}/${item.id}/edit`} className="underline">
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(item.id)} className="underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
