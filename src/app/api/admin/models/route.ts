import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

const modelSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
});

export async function GET() {
  try {
    await requireAdmin();
    const { rows } = await pool.query(`SELECT id, name, slug FROM router_models ORDER BY name`);
    return NextResponse.json({ models: rows });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = modelSchema.parse(await req.json());
    const { rows } = await pool.query(
      `INSERT INTO router_models (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
      [data.name, data.slug]
    );
    return NextResponse.json({ model: rows[0] }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
