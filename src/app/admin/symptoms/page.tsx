import { AdminGuard } from "@/components/admin-guard";
import { NameSlugList } from "@/components/name-slug-list";

export default function AdminSymptomsPage() {
  return (
    <AdminGuard>
      <NameSlugList
        apiBase="/api/admin/symptoms"
        listKey="symptoms"
        title="Symptom categories"
        newHref="/admin/symptoms/new"
        editHrefBase="/admin/symptoms"
      />
    </AdminGuard>
  );
}
