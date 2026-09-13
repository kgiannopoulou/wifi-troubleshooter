// Session strategy: identical idea to the e-commerce app — a JWT in an
// httpOnly cookie — adapted from Express middleware to Next.js Route
// Handlers, which read/write cookies via next/headers instead of
// req.cookies/res.cookie.
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { HttpError } from "./api-error";

const COOKIE_NAME = "admin_token";

export interface AdminSession {
  id: number;
  email: string;
}

export async function issueAdminCookie(admin: AdminSession) {
  const token = jwt.sign(admin, env.jwtSecret, { expiresIn: "7d" });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Used by every protected /api/admin/* route to check who (if anyone) is
// signed in. Returns null instead of throwing so callers decide how to
// respond (401 JSON for API routes).
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret) as AdminSession;
  } catch {
    return null;
  }
}

// Call at the top of every protected /api/admin/* route. Throws instead of
// returning null so route handlers can do `const admin = await requireAdmin();`
// and let the route's own try/catch -> apiError() turn it into a 401.
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new HttpError(401, "Not authenticated");
  }
  return session;
}
