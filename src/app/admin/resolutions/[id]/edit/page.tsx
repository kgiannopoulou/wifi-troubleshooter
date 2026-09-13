"use client";

import { use, useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { ResolutionForm, Resolution } from "@/components/resolution-form";
import { apiFetch } from "@/lib/api-client";

export default function EditResolutionPage(props: PageProps<"/admin/resolutions/[id]/edit">) {
  const { id } = use(props.params);
  const [resolution, setResolution] = useState<Resolution | null>(null);

  useEffect(() => {
    apiFetch<{ resolution: Resolution }>(`/api/admin/resolutions/${id}`).then((data) =>
      setResolution(data.resolution)
    );
  }, [id]);

  return (
    <AdminGuard>{resolution ? <ResolutionForm resolution={resolution} /> : <p>Loading...</p>}</AdminGuard>
  );
}
