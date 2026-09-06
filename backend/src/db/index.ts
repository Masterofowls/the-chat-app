import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "./../load-env.js";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
const isTest = process.env.NODE_ENV === "test";

if (!connectionString && !isTest) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: connectionString ?? "postgresql://127.0.0.1:5432/messaging_app",
  max: 10,
  ssl: /supabase\.co(m)?/.test(connectionString ?? "")
    ? { rejectUnauthorized: false }
    : undefined,
  options: isTest ? "-c search_path=test,public" : undefined,
});

export const db = drizzle(pool, { schema });
