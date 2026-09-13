import { AdminGuard } from "@/components/admin-guard";
import { NodeForm } from "@/components/node-form";

export default async function NewNodePage(
  props: PageProps<"/admin/trees/[modelId]/[symptomId]/nodes/new">
) {
  const { modelId, symptomId } = await props.params;
  return (
    <AdminGuard>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">New question</h1>
        <NodeForm
          routerModelId={Number(modelId)}
          symptomId={Number(symptomId)}
          backHref={`/admin/trees/${modelId}/${symptomId}`}
        />
      </div>
    </AdminGuard>
  );
}
