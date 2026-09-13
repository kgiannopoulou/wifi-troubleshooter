import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";

const resolutionSchema = z.object({
  title: z.string().min(1),
  fixSteps: z.string().min(1),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT id, title, fix_steps FROM resolutions WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) throw new HttpError(404, "Resolution not found");
    return NextResponse.json({
      resolution: { id: rows[0].id, title: rows[0].title, fixSteps: rows[0].fix_steps },
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = resolutionSchema.parse(await req.json());
    const { rows } = await pool.query(
      `UPDATE resolutions SET title = $1, fix_steps = $2 WHERE id = $3
       RETURNING id, title, fix_steps`,
      [data.title, data.fixSteps, id]
    );
    if (rows.length === 0) throw new HttpError(404, "Resolution not found");
    return NextResponse.json({
      resolution: { id: rows[0].id, title: rows[0].title, fixSteps: rows[0].fix_steps },
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    // node_options.resolution_id is ON DELETE SET NULL, but the exactly-one-
    // target CHECK constraint means clearing it without also clearing
    // next_node_id would violate the constraint. Block deletion if any
    // option still points at this resolution, so the admin fixes those
    // options first rather than the delete failing with a raw DB error.
    const { rows: usedBy } = await pool.query(
      `SELECT id FROM node_options WHERE resolution_id = $1 LIMIT 1`,
      [id]
    );
    if (usedBy.length > 0) {
      throw new HttpError(
        409,
        "This resolution is still used by at least one question option — remove or repoint that option first"
      );
    }
    const { rowCount } = await pool.query(`DELETE FROM resolutions WHERE id = $1`, [id]);
    if (rowCount === 0) throw new HttpError(404, "Resolution not found");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return apiError(err);
  }
}
