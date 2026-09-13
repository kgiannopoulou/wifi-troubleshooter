import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";

const optionSchema = z
  .object({
    label: z.string().min(1),
    nextNodeId: z.number().int().positive().optional(),
    resolutionId: z.number().int().positive().optional(),
  })
  .refine((opt) => Boolean(opt.nextNodeId) !== Boolean(opt.resolutionId), {
    message: "Each option must link to exactly one of nextNodeId or resolutionId",
  });

const updateNodeSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(optionSchema).min(1),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const { rows: nodeRows } = await pool.query(
      `SELECT id, router_model_id, symptom_id, question_text, is_root FROM nodes WHERE id = $1`,
      [id]
    );
    if (nodeRows.length === 0) throw new HttpError(404, "Question not found");

    const { rows: options } = await pool.query(
      `SELECT id, label, next_node_id, resolution_id FROM node_options
       WHERE node_id = $1 ORDER BY sort_order`,
      [id]
    );

    const n = nodeRows[0];
    return NextResponse.json({
      node: {
        id: n.id,
        routerModelId: n.router_model_id,
        symptomId: n.symptom_id,
        questionText: n.question_text,
        isRoot: n.is_root,
        options: options.map((o) => ({
          id: o.id,
          label: o.label,
          nextNodeId: o.next_node_id,
          resolutionId: o.resolution_id,
        })),
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = updateNodeSchema.parse(await req.json());

    // An option can't link a node to itself — that would be an infinite
    // loop in the public wizard with no way to reach a resolution.
    if (data.options.some((o) => o.nextNodeId === Number(id))) {
      throw new HttpError(400, "An option cannot link a question back to itself");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `UPDATE nodes SET question_text = $1 WHERE id = $2 RETURNING id`,
        [data.questionText, id]
      );
      if (rows.length === 0) throw new HttpError(404, "Question not found");

      // Simplest correct way to sync options with a form-based editor:
      // replace the whole set rather than diffing individual rows.
      await client.query(`DELETE FROM node_options WHERE node_id = $1`, [id]);
      for (const [index, option] of data.options.entries()) {
        await client.query(
          `INSERT INTO node_options (node_id, label, sort_order, next_node_id, resolution_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, option.label, index, option.nextNodeId ?? null, option.resolutionId ?? null]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Deleting this node would otherwise leave any option that pointed at
    // it (next_node_id, ON DELETE SET NULL) with neither a next node nor a
    // resolution, violating the node_options_exactly_one_target CHECK
    // constraint at the database level. Catch it early with a clear message.
    const { rows: referencedBy } = await pool.query(
      `SELECT id FROM node_options WHERE next_node_id = $1 LIMIT 1`,
      [id]
    );
    if (referencedBy.length > 0) {
      throw new HttpError(
        409,
        "Another question's option still links to this one — repoint that option first"
      );
    }

    const { rowCount } = await pool.query(`DELETE FROM nodes WHERE id = $1`, [id]);
    if (rowCount === 0) throw new HttpError(404, "Question not found");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return apiError(err);
  }
}
