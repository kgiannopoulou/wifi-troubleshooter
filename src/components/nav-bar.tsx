"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth-context";

export function NavBar() {
  const { admin, loading, logout } = useAdminAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          WiFi Troubleshooter
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {!loading && admin ? (
            <>
              <Link href="/admin">Admin</Link>
              <button onClick={handleLogout} className="cursor-pointer">
                Log out ({admin.email})
              </button>
            </>
          ) : (
            !loading && <Link href="/admin/login">Admin login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
