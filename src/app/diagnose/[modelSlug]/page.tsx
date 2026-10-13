import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelBySlug, getSymptomsForModel } from "@/lib/catalog";

export default async function ModelSymptomsPage(props: PageProps<"/diagnose/[modelSlug]">) {
  const { modelSlug } = await props.params;
  const model = await getModelBySlug(modelSlug);
  if (!model) notFound();

  const symptoms = await getSymptomsForModel(model.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm underline">
          &larr; Choose a different router
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{model.name}</h1>
        <p className="mt-1 opacity-70">What&apos;s the problem?</p>
      </div>

      <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {symptoms.map((symptom) =>
          symptom.rootNodeId ? (
            <Link
              key={symptom.id}
              href={`/diagnose/${model.slug}/${symptom.slug}`}
              className="flex items-center justify-between py-3 hover:underline"
            >
              <span>{symptom.name}</span>
              <span aria-hidden>&rarr;</span>
            </Link>
          ) : (
            <div key={symptom.id} className="flex items-center justify-between py-3 opacity-40">
              <span>{symptom.name}</span>
              <span className="text-xs uppercase">Coming soon</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
