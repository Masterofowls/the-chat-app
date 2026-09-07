import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "../db/schema.js";

const MENTION_RE = /(?:^|[\s([{])@([a-zA-Z0-9_]{2,32})\b/g;

export function extractMentionUsernames(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    const name = match[1]?.toLowerCase();
    if (name) found.add(name);
  }
  return [...found];
}

export async function resolveMentionedUsers(body: string) {
  const usernames = extractMentionUsernames(body);
  if (usernames.length === 0) return [];

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(
      sql`lower(${user.username}) in (${sql.join(
        usernames.map((name) => sql`${name}`),
        sql`, `,
      )})`,
    );

  return rows;
}

export function highlightPreview(body: string, max = 120): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
