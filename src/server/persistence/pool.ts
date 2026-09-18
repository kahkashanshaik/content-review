import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;
let migrated = false;

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "postgresql://localhost:5432/content_review";
}

export function getPool(): pg.Pool {
  if (pool === undefined) {
    pool = new Pool({ connectionString: databaseUrl() });
  }

  return pool;
}

export async function ensureSchema(client: pg.Pool | pg.PoolClient = getPool()): Promise<void> {
  if (migrated) {
    return;
  }

  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  await client.query(sql);
  migrated = true;
}

export async function withClient<T>(run: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const active = getPool();
  await ensureSchema(active);
  const client = await active.connect();
  try {
    return await run(client);
  } finally {
    client.release();
  }
}
