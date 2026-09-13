import { AdminGuard } from "@/components/admin-guard";
import { NameSlugList } from "@/components/name-slug-list";

export default function AdminModelsPage() {
  return (
    <AdminGuard>
      <NameSlugList
        apiBase="/api/admin/models"
        listKey="models"
        title="Router models"
        newHref="/admin/models/new"
        editHrefBase="/admin/models"
      />
    </AdminGuard>
  );
}
