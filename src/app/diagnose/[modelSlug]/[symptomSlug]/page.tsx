import { notFound } from "next/navigation";
import { getModelBySlug, getSymptomsForModel } from "@/lib/catalog";
import { DiagnosticWizard } from "@/components/diagnostic-wizard";

// Server Component resolves the starting node id from the slugs in the
// URL; the actual step-by-step interaction is handed off to a Client
// Component (DiagnosticWizard) since it needs to fetch a new node on every
// button click without a full page navigation.
export default async function DiagnosePage(
  props: PageProps<"/diagnose/[modelSlug]/[symptomSlug]">
) {
  const { modelSlug, symptomSlug } = await props.params;
  const model = await getModelBySlug(modelSlug);
  if (!model) notFound();

  const symptoms = await getSymptomsForModel(model.id);
  const symptom = symptoms.find((s) => s.slug === symptomSlug);
  if (!symptom || !symptom.rootNodeId) notFound();

  return (
    <DiagnosticWizard
      modelSlug={model.slug}
      modelName={model.name}
      symptomName={symptom.name}
      rootNodeId={symptom.rootNodeId}
    />
  );
}
