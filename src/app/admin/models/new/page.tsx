import { AdminGuard } from "@/components/admin-guard";
import { NameSlugForm } from "@/components/name-slug-form";

export default function NewModelPage() {
  return (
    <AdminGuard>
      <NameSlugForm apiBase="/api/admin/models" backHref="/admin/models" title="New router model" />
    </AdminGuard>
  );
}
