import { afterAll, beforeAll, beforeEach } from "@jest/globals";
import type { Pool } from "pg";
import {
  createTestPool,
  hasDatabaseUrl,
  prepareTestSchema,
  truncateTestSchema,
} from "./helpers/testDb.js";

process.env.NODE_ENV = "test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-32";
process.env.BETTER_AUTH_URL ??= "http://localhost:9000";
process.env.CLIENT_ORIGIN ??= "http://localhost:9001";
process.env.RP_ID ??= "localhost";
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";

let pool: Pool | null = null;

beforeAll(async () => {
  if (!hasDatabaseUrl()) {
    return;
  }

  pool = createTestPool();
  await pool.query("SELECT 1");
  await prepareTestSchema(pool);
}, 30000);

beforeEach(async () => {
  if (!pool) {
    return;
  }
  await truncateTestSchema(pool);
});

afterAll(async () => {
  if (!pool) {
    return;
  }
  await pool.end();
});
