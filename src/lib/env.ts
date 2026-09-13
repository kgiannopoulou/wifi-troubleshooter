// Loads .env for scripts run directly via tsx (migrate.ts, seed.ts). Next.js
// itself loads .env automatically for the app/API routes, so this import is
// a no-op there — it's only load-bearing for the standalone scripts.
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
};
