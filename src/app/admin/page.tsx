import Link from "next/link";
import { AdminGuard } from "@/components/admin-guard";

export default function AdminHomePage() {
  return (
    <AdminGuard>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex flex-col gap-2 underline">
          <Link href="/admin/models">Router models</Link>
          <Link href="/admin/symptoms">Symptom categories</Link>
          <Link href="/admin/resolutions">Resolutions</Link>
          <Link href="/admin/trees">Diagnostic trees</Link>
        </div>
      </div>
    </AdminGuard>
  );
}
