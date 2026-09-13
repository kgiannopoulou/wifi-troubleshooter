"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { NameSlugForm } from "./name-slug-form";

type Item = { id: number; name: string; slug: string };

// Shared "fetch by id, then render the edit form" wrapper for both models
// and symptoms edit pages.
export function EditNameSlugPage({
  id,
  apiBase,
  itemKey,
  backHref,
  title,
}: {
  id: string;
  apiBase: string;
  itemKey: string;
  backHref: string;
  title: string;
}) {
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    apiFetch<Record<string, Item>>(`${apiBase}/${id}`).then((data) => setItem(data[itemKey]));
  }, [apiBase, id, itemKey]);

  if (!item) return <p>Loading...</p>;

  return <NameSlugForm apiBase={apiBase} backHref={backHref} title={title} item={item} />;
}
