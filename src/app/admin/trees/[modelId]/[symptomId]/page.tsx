import { AdminGuard } from "@/components/admin-guard";
import { TreeOutline } from "@/components/tree-outline";

export default async function TreeOutlinePage(
  props: PageProps<"/admin/trees/[modelId]/[symptomId]">
) {
  const { modelId, symptomId } = await props.params;
  return (
    <AdminGuard>
      <TreeOutline routerModelId={Number(modelId)} symptomId={Number(symptomId)} />
    </AdminGuard>
  );
}
