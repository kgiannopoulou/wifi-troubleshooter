import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";
import { lockTree } from "@/lib/tree-rules";

// Makes this question the starting point of its model+symptom tree. Needed
// so the root can be changed (and the old one then deleted), and so a tree
// that has lost its root can be repaired without recreating its questions.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT router_model_id, symptom_id FROM nodes WHERE id = $1`,
        [id]
      );
      if (rows.length === 0) throw new HttpError(404, "Question not found");
      const { router_model_id: modelId, symptom_id: symptomId } = rows[0];
      await lockTree(client, { routerModelId: modelId, symptomId });

      // Clear the old root first: nodes_one_root_per_tree_idx allows only
      // one root per tree at any moment.
      await client.query(
        `UPDATE nodes SET is_root = false
         WHERE router_model_id = $1 AND symptom_id = $2 AND is_root AND id <> $3`,
        [modelId, symptomId, id]
      );
      await client.query(`UPDATE nodes SET is_root = true WHERE id = $1`, [id]);

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
