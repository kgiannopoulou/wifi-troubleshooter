import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";
import { assertNoCycleThrough, assertValidTargets, lockTree } from "@/lib/tree-rules";

// Every option must lead somewhere — exactly one of nextNodeId/resolutionId,
// mirroring the node_options_exactly_one_target CHECK constraint in
// 0001_init.sql. Validating it here means a bad request gets a clear 400
// instead of a raw Postgres constraint-violation error.
const optionSchema = z
  .object({
    label: z.string().min(1),
    nextNodeId: z.number().int().positive().optional(),
    resolutionId: z.number().int().positive().optional(),
  })
  .refine((opt) => Boolean(opt.nextNodeId) !== Boolean(opt.resolutionId), {
    message: "Each option must link to exactly one of nextNodeId or resolutionId",
  });

const createNodeSchema = z.object({
  routerModelId: z.number().int().positive(),
  symptomId: z.number().int().positive(),
  questionText: z.string().min(1),
  options: z.array(optionSchema).min(1),
});

// Lists the nodes (with their options) for one model+symptom tree — used
// by the admin tree view and to populate "link this option to an existing
// question" dropdowns while authoring.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const modelId = Number(req.nextUrl.searchParams.get("routerModelId"));
    const symptomId = Number(req.nextUrl.searchParams.get("symptomId"));
    if (!modelId || !symptomId) {
      throw new HttpError(400, "routerModelId and symptomId query params are required");
    }

    const { rows: nodes } = await pool.query(
      `SELECT id, question_text, is_root FROM nodes
       WHERE router_model_id = $1 AND symptom_id = $2
       ORDER BY is_root DESC, id`,
      [modelId, symptomId]
    );
    const nodeIds = nodes.map((n) => n.id);

    const { rows: options } = nodeIds.length
      ? await pool.query(
          `SELECT o.id, o.node_id, o.label, o.sort_order, o.next_node_id, o.resolution_id,
                  r.title AS resolution_title
           FROM node_options o
           LEFT JOIN resolutions r ON r.id = o.resolution_id
           WHERE o.node_id = ANY($1::int[])
           ORDER BY o.sort_order`,
          [nodeIds]
        )
      : { rows: [] };

    const optionsByNode = new Map<number, typeof options>();
    for (const opt of options) {
      const list = optionsByNode.get(opt.node_id) ?? [];
      list.push(opt);
      optionsByNode.set(opt.node_id, list);
    }

    return NextResponse.json({
      nodes: nodes.map((n) => ({
        id: n.id,
        questionText: n.question_text,
        isRoot: n.is_root,
        options: (optionsByNode.get(n.id) ?? []).map((o) => ({
          id: o.id,
          label: o.label,
          nextNodeId: o.next_node_id,
          resolutionId: o.resolution_id,
          resolutionTitle: o.resolution_title,
        })),
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = createNodeSchema.parse(await req.json());

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const tree = { routerModelId: data.routerModelId, symptomId: data.symptomId };
      await lockTree(client, tree);

      const { rows: treeExists } = await client.query(
        `SELECT 1 FROM router_models m, symptoms s WHERE m.id = $1 AND s.id = $2`,
        [data.routerModelId, data.symptomId]
      );
      if (treeExists.length === 0) throw new HttpError(404, "Router model or symptom not found");
      await assertValidTargets(client, tree, data.options);

      // If this tree has no starting question yet (it's brand new, or its
      // previous root was replaced), the new question becomes the root, so
      // the public wizard always has an entry point. Admins can pick a
      // different one later ("Make starting question" in the tree outline).
      const { rows: existingRoot } = await client.query(
        `SELECT 1 FROM nodes WHERE router_model_id = $1 AND symptom_id = $2 AND is_root`,
        [data.routerModelId, data.symptomId]
      );
      const isRoot = existingRoot.length === 0;

      const { rows: nodeRows } = await client.query(
        `INSERT INTO nodes (router_model_id, symptom_id, question_text, is_root)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [data.routerModelId, data.symptomId, data.questionText, isRoot]
      );
      const nodeId = nodeRows[0].id;

      for (const [index, option] of data.options.entries()) {
        await client.query(
          `INSERT INTO node_options (node_id, label, sort_order, next_node_id, resolution_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [nodeId, option.label, index, option.nextNodeId ?? null, option.resolutionId ?? null]
        );
      }
      // A brand-new question can't be the target of any option yet, so it
      // can't close a loop — but the check is cheap and keeps POST and PUT
      // under the same rules.
      await assertNoCycleThrough(client, nodeId);

      await client.query("COMMIT");
      return NextResponse.json({ node: { id: nodeId, isRoot } }, { status: 201 });
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
