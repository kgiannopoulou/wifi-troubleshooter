import { AdminGuard } from "@/components/admin-guard";
import { TreePicker } from "@/components/tree-picker";

export default function AdminTreesPage() {
  return (
    <AdminGuard>
      <TreePicker />
    </AdminGuard>
  );
}
