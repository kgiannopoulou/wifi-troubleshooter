import { pool } from "./db";

export type NodeWithOptions = {
  node: { id: number; questionText: string };
  options: {
    id: number;
    label: string;
    nextNodeId: number | null;
    resolution: { id: number; title: string; fixSteps: string } | null;
  }[];
};

// Shared by GET /api/nodes/root and GET /api/nodes/[id] — the public wizard
// flow is just "fetch a node's question + options, and for whichever option
// the user clicks, either fetch the next node (if nextNodeId is set) or
// show the resolution that's already embedded inline (if resolution is
// set)". No recursion needed for this — the tree is only ever walked one
// step at a time.
export async function getNodeWithOptions(nodeId: number): Promise<NodeWithOptions | null> {
  const nodeRes = await pool.query<{ id: number; question_text: string }>(
    `SELECT id, question_text FROM nodes WHERE id = $1`,
    [nodeId]
  );
  if (nodeRes.rows.length === 0) return null;

  const optionsRes = await pool.query<{
    id: number;
    label: string;
    next_node_id: number | null;
    resolution_id: number | null;
    resolution_title: string | null;
    resolution_fix_steps: string | null;
  }>(
    `SELECT o.id, o.label, o.next_node_id,
            r.id AS resolution_id, r.title AS resolution_title, r.fix_steps AS resolution_fix_steps
     FROM node_options o
     LEFT JOIN resolutions r ON r.id = o.resolution_id
     WHERE o.node_id = $1
     ORDER BY o.sort_order`,
    [nodeId]
  );

  return {
    node: { id: nodeRes.rows[0].id, questionText: nodeRes.rows[0].question_text },
    options: optionsRes.rows.map((row) => ({
      id: row.id,
      label: row.label,
      nextNodeId: row.next_node_id,
      resolution: row.resolution_id
        ? { id: row.resolution_id, title: row.resolution_title!, fixSteps: row.resolution_fix_steps! }
        : null,
    })),
  };
}
