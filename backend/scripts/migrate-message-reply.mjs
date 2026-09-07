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
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id text`,
  `CREATE INDEX IF NOT EXISTS messages_replyToId_idx ON public.messages (reply_to_id)`,
  `ALTER TABLE test.messages ADD COLUMN IF NOT EXISTS reply_to_id text`,
  `CREATE INDEX IF NOT EXISTS test_messages_replyToId_idx ON test.messages (reply_to_id)`,
];

for (const sql of statements) {
  await pool.query(sql);
  console.log("ok:", sql.slice(0, 80));
}
await pool.end();
