import { AdminGuard } from "@/components/admin-guard";
import { EditNameSlugPage } from "@/components/edit-name-slug-page";

export default async function EditModelPage(props: PageProps<"/admin/models/[id]/edit">) {
  const { id } = await props.params;
  return (
    <AdminGuard>
      <EditNameSlugPage
        id={id}
        apiBase="/api/admin/models"
        itemKey="model"
        backHref="/admin/models"
        title="Edit router model"
      />
    </AdminGuard>
  );
}
