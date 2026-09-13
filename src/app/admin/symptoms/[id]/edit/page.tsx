import { AdminGuard } from "@/components/admin-guard";
import { EditNameSlugPage } from "@/components/edit-name-slug-page";

export default async function EditSymptomPage(props: PageProps<"/admin/symptoms/[id]/edit">) {
  const { id } = await props.params;
  return (
    <AdminGuard>
      <EditNameSlugPage
        id={id}
        apiBase="/api/admin/symptoms"
        itemKey="symptom"
        backHref="/admin/symptoms"
        title="Edit symptom category"
      />
    </AdminGuard>
  );
}
