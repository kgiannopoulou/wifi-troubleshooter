// Server-side rules that keep every diagnostic tree walkable. The admin UI
// only offers valid choices, but these checks run on every write so a
// hand-crafted or stale request can't break a tree either:
//
//   - an option may only lead to a question in the *same* model+symptom tree
//   - no option may create a loop (A -> B -> A, or longer), which would trap
//     a user in the wizard with no way to reach a resolution
//   - writes to one tree are serialized, so two admins editing at the same
//     time can't each add half of a loop that the other's check didn't see
import type { PoolClient } from "pg";
import { HttpError } from "./api-error";

export type TreeKey = { routerModelId: number; symptomId: number };
type OptionTargets = { nextNodeId?: number; resolutionId?: number };

// Transaction-scoped advisory lock on one model+symptom pair: released
// automatically at COMMIT/ROLLBACK. Must be the first thing a write to a
// tree does inside its transaction.
export async function lockTree(client: PoolClient, tree: TreeKey) {
  await client.query(`SELECT pg_advisory_xact_lock($1, $2)`, [tree.routerModelId, tree.symptomId]);
}

// Every nextNodeId must be a question in this same tree, and every
// resolutionId must exist.
export async function assertValidTargets(
  client: PoolClient,
  tree: TreeKey,
  options: OptionTargets[]
) {
  const nextIds = [...new Set(options.flatMap((o) => (o.nextNodeId ? [o.nextNodeId] : [])))];
  if (nextIds.length > 0) {
    const { rows } = await client.query<{ id: number }>(
      `SELECT id FROM nodes
       WHERE id = ANY($1::int[]) AND router_model_id = $2 AND symptom_id = $3`,
      [nextIds, tree.routerModelId, tree.symptomId]
    );
    if (rows.length !== nextIds.length) {
      throw new HttpError(
        400,
        "An option links to a question that doesn't exist or belongs to a different router model / symptom"
      );
    }
  }

  const resolutionIds = [
    ...new Set(options.flatMap((o) => (o.resolutionId ? [o.resolutionId] : []))),
  ];
  if (resolutionIds.length > 0) {
    const { rows } = await client.query(`SELECT id FROM resolutions WHERE id = ANY($1::int[])`, [
      resolutionIds,
    ]);
    if (rows.length !== resolutionIds.length) {
      throw new HttpError(400, "An option links to a resolution that doesn't exist");
    }
  }
}

// Run after a node's options have been written (inside the same
// transaction). The tree had no loops before this write, so any new loop
// must pass through this node: it's enough to check whether the node can
// reach itself. UNION (not UNION ALL) drops already-visited ids, so the walk
// always terminates.
export async function assertNoCycleThrough(client: PoolClient, nodeId: number) {
  const { rows } = await client.query(
    `WITH RECURSIVE reachable(id) AS (
       SELECT next_node_id FROM node_options WHERE node_id = $1 AND next_node_id IS NOT NULL
       UNION
       SELECT o.next_node_id FROM node_options o
       JOIN reachable r ON o.node_id = r.id
       WHERE o.next_node_id IS NOT NULL
     )
     SELECT 1 FROM reachable WHERE id = $1 LIMIT 1`,
    [nodeId]
  );
  if (rows.length > 0) {
    throw new HttpError(
      400,
      "This would create a loop: one of these options eventually leads back to this question"
    );
  }
}
