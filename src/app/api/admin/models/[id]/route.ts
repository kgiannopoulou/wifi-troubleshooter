import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";

const modelSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT id, name, slug FROM router_models WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) throw new HttpError(404, "Router model not found");
    return NextResponse.json({ model: rows[0] });
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = modelSchema.parse(await req.json());
    const { rows } = await pool.query(
      `UPDATE router_models SET name = $1, slug = $2 WHERE id = $3 RETURNING id, name, slug`,
      [data.name, data.slug, id]
    );
    if (rows.length === 0) throw new HttpError(404, "Router model not found");
    return NextResponse.json({ model: rows[0] });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    // ON DELETE CASCADE on nodes.router_model_id (see 0001_init.sql) means
    // deleting a model also removes every diagnostic tree built for it.
    const { rowCount } = await pool.query(`DELETE FROM router_models WHERE id = $1`, [id]);
    if (rowCount === 0) throw new HttpError(404, "Router model not found");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return apiError(err);
  }
}
