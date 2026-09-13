import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      {/* Suspense is required because AdminLoginForm calls useSearchParams()
          (to read ?next=...), which opts it out of static rendering. */}
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
