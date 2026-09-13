"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth-context";

// Wraps every page under /admin except /admin/login. Same caveat as the
// e-commerce app's AdminGuard: this is a client-side redirect for UX only,
// not the real security boundary — every /api/admin/* route independently
// calls requireAdmin() (see src/lib/auth.ts) and rejects unauthenticated
// requests regardless of what this component does.
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!admin) {
      router.push(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, admin, router, pathname]);

  if (loading || !admin) {
    return <p>Loading...</p>;
  }

  return <>{children}</>;
}
