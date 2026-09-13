import { AdminGuard } from "@/components/admin-guard";
import { ResolutionForm } from "@/components/resolution-form";

export default function NewResolutionPage() {
  return (
    <AdminGuard>
      <ResolutionForm />
    </AdminGuard>
  );
}
