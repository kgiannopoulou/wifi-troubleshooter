// Read queries shared between the public API routes and the public Server
// Component pages. Server Components query the database directly through
// this module rather than fetching our own /api/* routes over HTTP — since
// they run in the same process, that would be a pointless network round
// trip to ourselves. Client Components (the interactive wizard, the admin
// panel) still go through fetch("/api/...") because they run in the browser.
import { pool } from "./db";

export type RouterModel = { id: number; name: string; slug: string };
export type SymptomWithTree = {
  id: number;
  name: string;
  slug: string;
  rootNodeId: number | null;
};

export async function getRouterModels(): Promise<RouterModel[]> {
  const { rows } = await pool.query(`SELECT id, name, slug FROM router_models ORDER BY name`);
  return rows;
}

export async function getModelBySlug(slug: string): Promise<RouterModel | null> {
  const { rows } = await pool.query(
    `SELECT id, name, slug FROM router_models WHERE slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function getSymptomsForModel(modelId: number): Promise<SymptomWithTree[]> {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.slug, n.id AS root_node_id
     FROM symptoms s
     LEFT JOIN nodes n ON n.symptom_id = s.id AND n.router_model_id = $1 AND n.is_root
     ORDER BY s.name`,
    [modelId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    rootNodeId: row.root_node_id,
  }));
}
