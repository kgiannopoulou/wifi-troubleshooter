import { Pool } from "pg";
import { env } from "./env";

// Shared connection pool used by every API route and script. A global is
// used (instead of a plain module-level singleton) because Next.js dev mode
// hot-reloads route modules on every request, which would otherwise create
// a fresh Pool (and leak connections) on each edit.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool = globalForDb.pgPool ?? new Pool({ connectionString: env.databaseUrl });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}
