import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema.js";

export const TEST_SCHEMA = "test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(
  path.resolve(dirname, "../../drizzle/0000_init.sql"),
  "utf8",
);

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function createTestPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for integration tests");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    ssl: /supabase\.co(m)?/.test(process.env.DATABASE_URL)
      ? { rejectUnauthorized: false }
      : undefined,
    options: "-c search_path=test,public",
  });

  return pool;
}

export function createTestDb(pool: Pool) {
  return drizzle(pool, { schema });
}

export async function prepareTestSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${TEST_SCHEMA}`);
  await pool.query(`SET search_path TO ${TEST_SCHEMA}, public`);
  await pool.query(migrationSql);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS username text;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS display_username text;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS custom_status text;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS description text;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS last_active_at timestamp;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS show_last_active boolean NOT NULL DEFAULT true;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS show_device_info boolean NOT NULL DEFAULT true;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS telegram_id text;
  `);
  await pool.query(`
    ALTER TABLE ${TEST_SCHEMA}."user"
      ADD COLUMN IF NOT EXISTS telegram_username text;
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique
      ON ${TEST_SCHEMA}."user" (username);
  `);
}

export async function truncateTestSchema(pool: Pool): Promise<void> {
  await pool.query(`SET search_path TO ${TEST_SCHEMA}, public`);
  await pool.query(`
    TRUNCATE TABLE
      ${TEST_SCHEMA}.messages,
      ${TEST_SCHEMA}.participants,
      ${TEST_SCHEMA}.conversations,
      ${TEST_SCHEMA}.otp_codes,
      ${TEST_SCHEMA}.telegram_links,
      ${TEST_SCHEMA}.passkey,
      ${TEST_SCHEMA}.two_factor,
      ${TEST_SCHEMA}.verification,
      ${TEST_SCHEMA}.account,
      ${TEST_SCHEMA}.session,
      ${TEST_SCHEMA}."user"
    RESTART IDENTITY CASCADE
  `);
}
