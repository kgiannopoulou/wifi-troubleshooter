import { AdminGuard } from "@/components/admin-guard";
import { NameSlugForm } from "@/components/name-slug-form";

export default function NewSymptomPage() {
  return (
    <AdminGuard>
      <NameSlugForm
        apiBase="/api/admin/symptoms"
        backHref="/admin/symptoms"
        title="New symptom category"
      />
    </AdminGuard>
  );
}
