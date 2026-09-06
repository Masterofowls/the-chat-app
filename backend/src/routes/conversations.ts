import { randomUUID } from "node:crypto";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Conversation, Message, UserSummary } from "../../../shared/types.js";
import { db } from "../db/index.js";
import { conversations, messages, participants, user } from "../db/schema.js";
import { toPublicUserSummary } from "../lib/user-summary.js";
import { asAuthed, requireSession } from "../middleware/requireSession.js";
import { isUserOnline } from "../presence.js";

export const conversationsRouter = Router();

conversationsRouter.use(requireSession);

conversationsRouter.get("/", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const rows = await db
      .select({ conversationId: participants.conversationId })
      .from(participants)
      .where(eq(participants.userId, authed.user.id));

    const ids = rows.map((row) => row.conversationId);
    const result = await Promise.all(ids.map((id) => loadConversation(id)));
    const items = result
      .filter((item): item is Conversation => item !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    res.json({ conversations: items });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.get("/users", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        customStatus: user.customStatus,
        lastActiveAt: user.lastActiveAt,
        showLastActive: user.showLastActive,
        showDeviceInfo: user.showDeviceInfo,
      })
      .from(user)
      .where(
        query
          ? and(
              ne(user.id, authed.user.id),
              or(
                sql`lower(${user.email}) like ${`%${query}%`}`,
                sql`lower(${user.name}) like ${`%${query}%`}`,
                sql`lower(coalesce(${user.username}, '')) like ${`%${query}%`}`,
              ),
            )
          : ne(user.id, authed.user.id),
      )
      .limit(20);

    res.json({
      users: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: "",
        image: row.image,
        username: row.username,
        customStatus: row.customStatus,
        isOnline: undefined,
        lastActiveAt: row.showLastActive ? row.lastActiveAt?.toISOString() ?? null : null,
      })) satisfies UserSummary[],
    });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.post("/direct", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const parsed = z
      .object({
        userId: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success || (!parsed.data.userId && !parsed.data.email)) {
      res.status(400).json({ error: "userId or email is required" });
      return;
    }

    const [peer] = await db
      .select()
      .from(user)
      .where(
        parsed.data.userId
          ? eq(user.id, parsed.data.userId)
          : eq(user.email, parsed.data.email ?? ""),
      )
      .limit(1);

    if (!peer) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (peer.id === authed.user.id) {
      res.status(400).json({ error: "Cannot start a conversation with yourself" });
      return;
    }

    const existing = await findDirectConversation(authed.user.id, peer.id);
    if (existing) {
      res.json({ conversation: existing });
      return;
    }

    const now = new Date();
    const conversationId = randomUUID();

    await db.insert(conversations).values({
      id: conversationId,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(participants).values([
      {
        id: randomUUID(),
        conversationId,
        userId: authed.user.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        conversationId,
        userId: peer.id,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const created = await loadConversation(conversationId);
    res.status(201).json({ conversation: created });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.get("/:id/messages", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const conversationId = req.params.id;
    if (!conversationId) {
      res.status(400).json({ error: "Conversation id is required" });
      return;
    }

    const member = await isMember(conversationId, authed.user.id);
    if (!member) {
      res.status(403).json({ error: "Not a member of this conversation" });
      return;
    }

    const rows = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        body: messages.body,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        senderName: user.name,
        senderEmail: user.email,
        senderImage: user.image,
      })
      .from(messages)
      .innerJoin(user, eq(messages.senderId, user.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const history: Message[] = rows.reverse().map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      sender: {
        id: row.senderId,
        name: row.senderName,
        email: row.senderEmail,
        image: row.senderImage,
      },
    }));

    res.json({ messages: history });
  } catch (error) {
    next(error);
  }
});

async function isMember(conversationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(eq(participants.conversationId, conversationId), eq(participants.userId, userId)),
    )
    .limit(1);

  return Boolean(row);
}

async function findDirectConversation(
  userId: string,
  peerId: string,
): Promise<Conversation | null> {
  const mine = await db
    .select({ conversationId: participants.conversationId })
    .from(participants)
    .where(eq(participants.userId, userId));

  for (const row of mine) {
    const members = await db
      .select()
      .from(participants)
      .where(eq(participants.conversationId, row.conversationId));

    const ids = members.map((member) => member.userId).sort();
    if (ids.length === 2 && ids[0] === [userId, peerId].sort()[0] && ids[1] === [userId, peerId].sort()[1]) {
      return loadConversation(row.conversationId);
    }
  }

  return null;
}

async function loadConversation(conversationId: string): Promise<Conversation | null> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    return null;
  }

  const memberRows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      username: user.username,
      customStatus: user.customStatus,
      lastActiveAt: user.lastActiveAt,
      showLastActive: user.showLastActive,
      showDeviceInfo: user.showDeviceInfo,
    })
    .from(participants)
    .innerJoin(user, eq(participants.userId, user.id))
    .where(eq(participants.conversationId, conversationId));

  const participantsSummary = memberRows.map((row) => ({
    ...toPublicUserSummary(row),
    isOnline: isUserOnline(row.id),
  }));

  const [last] = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      senderName: user.name,
      senderEmail: user.email,
      senderImage: user.image,
    })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  return {
    id: conversation.id,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    participants: participantsSummary,
    lastMessage: last
      ? {
          id: last.id,
          conversationId: last.conversationId,
          senderId: last.senderId,
          body: last.body,
          createdAt: last.createdAt.toISOString(),
          updatedAt: last.updatedAt.toISOString(),
          sender: {
            id: last.senderId,
            name: last.senderName,
            email: last.senderEmail,
            image: last.senderImage,
          },
        }
      : null,
  };
}
