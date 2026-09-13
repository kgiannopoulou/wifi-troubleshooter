"use client";

import { use, useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { NodeForm, EditableNode } from "@/components/node-form";
import { apiFetch } from "@/lib/api-client";

export default function EditNodePage(
  props: PageProps<"/admin/trees/[modelId]/[symptomId]/nodes/[nodeId]/edit">
) {
  const { modelId, symptomId, nodeId } = use(props.params);
  const [node, setNode] = useState<EditableNode | null>(null);

  useEffect(() => {
    apiFetch<{ node: EditableNode }>(`/api/admin/nodes/${nodeId}`).then((data) =>
      setNode(data.node)
    );
  }, [nodeId]);

  return (
    <AdminGuard>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Edit question</h1>
        {node ? (
          <NodeForm
            routerModelId={Number(modelId)}
            symptomId={Number(symptomId)}
            node={node}
            backHref={`/admin/trees/${modelId}/${symptomId}`}
          />
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </AdminGuard>
  );
}
