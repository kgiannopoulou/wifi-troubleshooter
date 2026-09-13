import Link from "next/link";
import { getRouterModels } from "@/lib/catalog";

// Server Component: queries the database directly (see lib/catalog.ts)
// rather than fetching our own API, since this runs on the server already.
export default async function HomePage() {
  const models = await getRouterModels();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">WiFi Troubleshooter</h1>
        <p className="mt-2 opacity-70">
          A guided diagnostic tool for common WiFi problems, built from real ISP technical
          support experience. Pick your router model to get started.
        </p>
      </div>

      {models.length === 0 ? (
        <p className="text-sm opacity-70">No router models configured yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {models.map((model) => (
            <Link
              key={model.id}
              href={`/diagnose/${model.slug}`}
              className="rounded border border-black/10 p-4 font-medium hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
            >
              {model.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
