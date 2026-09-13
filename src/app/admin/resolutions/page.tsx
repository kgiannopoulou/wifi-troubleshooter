"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin-guard";
import { apiFetch } from "@/lib/api-client";
import { Resolution } from "@/components/resolution-form";

function ResolutionsList() {
  const [resolutions, setResolutions] = useState<Resolution[] | null>(null);

  function load() {
    apiFetch<{ resolutions: Resolution[] }>("/api/admin/resolutions").then((data) =>
      setResolutions(data.resolutions)
    );
  }

  useEffect(load, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this resolution?")) return;
    try {
      await apiFetch(`/api/admin/resolutions/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Resolutions</h1>
        <Link
          href="/admin/resolutions/new"
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          New
        </Link>
      </div>
      {resolutions === null ? (
        <p>Loading...</p>
      ) : resolutions.length === 0 ? (
        <p className="opacity-70">Nothing here yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {resolutions.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-3">
              <span>{r.title}</span>
              <span className="flex gap-3 text-sm">
                <Link href={`/admin/resolutions/${r.id}/edit`} className="underline">
                  Edit
                </Link>
                <button onClick={() => handleDelete(r.id)} className="underline">
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminResolutionsPage() {
  return (
    <AdminGuard>
      <ResolutionsList />
    </AdminGuard>
  );
}
