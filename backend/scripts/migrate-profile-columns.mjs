import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const i = trimmed.indexOf("=");
  if (i <= 0) continue;
  const key = trimmed.slice(0, i).trim();
  let value = trimmed.slice(i + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] ??= value;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS custom_status text`,
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS last_active_at timestamp`,
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS show_last_active boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS show_device_info boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS telegram_id text`,
  `ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS telegram_username text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_telegram_id_unique ON public."user" (telegram_id)`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS custom_status text`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS last_active_at timestamp`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS show_last_active boolean NOT NULL DEFAULT true`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS show_device_info boolean NOT NULL DEFAULT true`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS telegram_id text`,
  `ALTER TABLE test."user" ADD COLUMN IF NOT EXISTS telegram_username text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS test_user_telegram_id_unique ON test."user" (telegram_id)`,
];

for (const sql of statements) {
  await pool.query(sql);
  console.log("ok:", sql.slice(0, 70));
}
await pool.end();
