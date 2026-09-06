import { randomUUID } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema.js";

type Db = NodePgDatabase<typeof schema>;

export type TestUser = {
  id: string;
  name: string;
  email: string;
  token: string;
  cookie: string;
};

export async function insertTestUser(
  db: Db,
  overrides: Partial<Pick<TestUser, "name" | "email">> = {},
): Promise<TestUser> {
  const id = randomUUID();
  const token = randomUUID();
  const now = new Date();
  const name = overrides.name ?? `User ${id.slice(0, 8)}`;
  const email = overrides.email ?? `${id}@relay.test`;

  await db.insert(schema.user).values({
    id,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.session).values({
    id: randomUUID(),
    token,
    userId: id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    name,
    email,
    token,
    cookie: `better-auth.session_token=${token}`,
  };
}
