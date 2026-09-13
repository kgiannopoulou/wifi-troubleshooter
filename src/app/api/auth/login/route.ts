import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { issueAdminCookie } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// There's no public signup for this app — the single admin row is created
// by the seed script (see src/db/seed.ts, from ADMIN_EMAIL/ADMIN_PASSWORD).
export async function POST(req: NextRequest) {
  try {
    const { email, password } = credentialsSchema.parse(await req.json());

    const { rows } = await pool.query(
      "SELECT id, email, password_hash FROM admins WHERE email = $1",
      [email]
    );
    const record = rows[0];
    if (!record) {
      throw new HttpError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, record.password_hash);
    if (!valid) {
      throw new HttpError(401, "Invalid email or password");
    }

    await issueAdminCookie({ id: record.id, email: record.email });
    return NextResponse.json({ admin: { id: record.id, email: record.email } });
  } catch (err) {
    return apiError(err);
  }
}
