import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/api-error";

// Powers the admin "tree outline" view: a depth-first walk from the root
// question down through each option's next_node_id, so the outline reads
// in the same order a user would actually experience the wizard — unlike
// the flat /api/admin/nodes list, which is just insertion order.
//
// `path` accumulates visited ids to guard against cycles (the app never
// creates one — see the "cannot link back to itself" check in
// admin/nodes/[id]/route.ts — but a defensive guard costs nothing here).
const TREE_QUERY = `
  WITH RECURSIVE walk AS (
    SELECT n.id, n.question_text, 0 AS depth, ARRAY[n.id] AS path
    FROM nodes n
    WHERE n.router_model_id = $1 AND n.symptom_id = $2 AND n.is_root
    UNION ALL
    SELECT n2.id, n2.question_text, walk.depth + 1, walk.path || n2.id
    FROM node_options o
    JOIN nodes n2 ON n2.id = o.next_node_id
    JOIN walk ON walk.id = o.node_id
    WHERE NOT n2.id = ANY(walk.path)
  )
  SELECT id, question_text, depth FROM walk ORDER BY path;
`;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const modelId = Number(req.nextUrl.searchParams.get("routerModelId"));
    const symptomId = Number(req.nextUrl.searchParams.get("symptomId"));
    if (!modelId || !symptomId) {
      throw new HttpError(400, "routerModelId and symptomId query params are required");
    }

    const { rows: walked } = await pool.query(TREE_QUERY, [modelId, symptomId]);
    const nodeIds = walked.map((n) => n.id);

    const { rows: options } = nodeIds.length
      ? await pool.query(
          `SELECT o.node_id, o.label, o.next_node_id, r.title AS resolution_title
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
      nodes: walked.map((n) => ({
        id: n.id,
        questionText: n.question_text,
        depth: n.depth,
        options: (optionsByNode.get(n.id) ?? []).map((o) => ({
          label: o.label,
          leadsTo: o.next_node_id
            ? { type: "question" as const, nodeId: o.next_node_id }
            : { type: "resolution" as const, title: o.resolution_title },
        })),
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}
