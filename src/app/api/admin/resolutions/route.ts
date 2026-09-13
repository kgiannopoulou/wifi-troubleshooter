import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

const resolutionSchema = z.object({
  title: z.string().min(1),
  fixSteps: z.string().min(1),
});

export async function GET() {
  try {
    await requireAdmin();
    const { rows } = await pool.query(
      `SELECT id, title, fix_steps FROM resolutions ORDER BY title`
    );
    return NextResponse.json({
      resolutions: rows.map((r) => ({ id: r.id, title: r.title, fixSteps: r.fix_steps })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = resolutionSchema.parse(await req.json());
    const { rows } = await pool.query(
      `INSERT INTO resolutions (title, fix_steps) VALUES ($1, $2) RETURNING id, title, fix_steps`,
      [data.title, data.fixSteps]
    );
    return NextResponse.json(
      { resolution: { id: rows[0].id, title: rows[0].title, fixSteps: rows[0].fix_steps } },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}
