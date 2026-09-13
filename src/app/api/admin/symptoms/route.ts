import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

const symptomSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
});

export async function GET() {
  try {
    await requireAdmin();
    const { rows } = await pool.query(`SELECT id, name, slug FROM symptoms ORDER BY name`);
    return NextResponse.json({ symptoms: rows });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = symptomSchema.parse(await req.json());
    const { rows } = await pool.query(
      `INSERT INTO symptoms (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
      [data.name, data.slug]
    );
    return NextResponse.json({ symptom: rows[0] }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
