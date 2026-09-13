import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

// Polled by the admin frontend on load to check whether an admin session
// cookie is present and valid, so the UI knows whether to show the login
// form or the admin dashboard.
export async function GET() {
  const admin = await getAdminSession();
  return NextResponse.json({ admin });
}
