import type { Server as HttpServer } from "node:http";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  Message,
  MessageReplyPreview,
  NotificationPayload,
  ServerToClientEvents,
  SocketData,
  UserSummary,
} from "../../../shared/types.js";
import { isAllowedBrowserOrigin } from "../config.js";
import { db } from "../db/index.js";
import { conversations, messages, participants, user } from "../db/schema.js";
import { highlightPreview, resolveMentionedUsers } from "../lib/mentions.js";
import { resolveSession } from "../middleware/requireSession.js";
import { isUserOnline, markOffline, markOnline } from "../presence.js";
import { conversationRoom, SOCKET_EVENTS, userRoom } from "./events.js";

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: AppSocketServer | null = null;

export function getIo(): AppSocketServer | null {
  return io;
}

async function touchPresence(userId: string, online: boolean) {
  const now = new Date();
  await db
    .update(user)
    .set({ lastActiveAt: now, updatedAt: now })
    .where(eq(user.id, userId));

  io?.emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
    userId,
    isOnline: online,
    lastActiveAt: now.toISOString(),
  });
}

async function loadReplyPreview(
  replyToId: string | null | undefined,
  conversationId: string,
): Promise<MessageReplyPreview | null> {
  if (!replyToId) return null;
  const [row] = await db
    .select({
      id: messages.id,
      body: messages.body,
      senderId: messages.senderId,
      senderName: user.name,
      conversationId: messages.conversationId,
    })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(and(eq(messages.id, replyToId), eq(messages.conversationId, conversationId)))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    body: row.body,
    senderId: row.senderId,
    senderName: row.senderName,
  };
}

function notifyUser(targetUserId: string, payload: NotificationPayload) {
  io?.to(userRoom(targetUserId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}

export function initSocket(httpServer: HttpServer): AppSocketServer {
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isAllowedBrowserOrigin(origin));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const session = await resolveSession(socket.request.headers);
      if (!session) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.user = session.user;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const currentUser = socket.data.user;
    void socket.join(userRoom(currentUser.id));
    markOnline(currentUser.id);
    void touchPresence(currentUser.id, true);

    socket.on("disconnect", () => {
      const wentOffline = markOffline(currentUser.id);
      if (wentOffline) {
        void touchPresence(currentUser.id, false);
      }
    });

    socket.on(SOCKET_EVENTS.PRESENCE_PING, () => {
      void touchPresence(currentUser.id, isUserOnline(currentUser.id));
    });

    socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async ({ conversationId }) => {
      const member = await isMember(conversationId, currentUser.id);
      if (!member) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "FORBIDDEN",
          message: "Not a member of this conversation",
        });
        return;
      }
      await socket.join(conversationRoom(conversationId));
    });

    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, async ({ conversationId }) => {
      await socket.leave(conversationRoom(conversationId));
    });

    socket.on(SOCKET_EVENTS.MESSAGE_SEND, async ({ conversationId, body, replyToId }) => {
      const trimmed = body.trim();
      if (!trimmed) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "VALIDATION",
          message: "Message body is required",
        });
        return;
      }

      const member = await isMember(conversationId, currentUser.id);
      if (!member) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "FORBIDDEN",
          message: "Not a member of this conversation",
        });
        return;
      }

      const replyTo = await loadReplyPreview(replyToId ?? null, conversationId);
      if (replyToId && !replyTo) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "VALIDATION",
          message: "Reply target not found in this conversation",
        });
        return;
      }

      const mentionedUsers = await resolveMentionedUsers(trimmed);
      const mentionIds = mentionedUsers.map((item) => item.id);

      const now = new Date();
      const [created] = await db
        .insert(messages)
        .values({
          id: randomUUID(),
          conversationId,
          senderId: currentUser.id,
          body: trimmed,
          replyToId: replyTo?.id ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!created) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "INTERNAL",
          message: "Failed to store message",
        });
        return;
      }

      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, conversationId));

      const sender: UserSummary = {
        ...currentUser,
        username: currentUser.username ?? null,
      };

      const payload: Message = {
        id: created.id,
        conversationId: created.conversationId,
        senderId: created.senderId,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        sender,
        replyToId: replyTo?.id ?? null,
        replyTo,
        mentions: mentionIds,
      };

      io?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.MESSAGE_NEW, payload);

      const memberRows = await db
        .select({ userId: participants.userId })
        .from(participants)
        .where(eq(participants.conversationId, conversationId));

      const peerIds = memberRows
        .map((row) => row.userId)
        .filter((id) => id !== currentUser.id);

      const preview = highlightPreview(trimmed);
      const createdAt = now.toISOString();

      for (const peerId of peerIds) {
        const isMention = mentionIds.includes(peerId);
        const isReply = replyTo?.senderId === peerId;
        const type = isMention ? "mention" : isReply ? "reply" : "message";
        const title =
          type === "mention"
            ? `${currentUser.name} mentioned you`
            : type === "reply"
              ? `${currentUser.name} replied to you`
              : currentUser.name;

        notifyUser(peerId, {
          id: randomUUID(),
          type,
          title,
          body: preview,
          conversationId,
          messageId: created.id,
          createdAt,
          fromUserId: currentUser.id,
          fromUserName: currentUser.name,
        });
      }

      // Mentions of users outside this conversation still get a ping if they exist.
      for (const mentioned of mentionedUsers) {
        if (mentioned.id === currentUser.id || peerIds.includes(mentioned.id)) continue;
        notifyUser(mentioned.id, {
          id: randomUUID(),
          type: "mention",
          title: `${currentUser.name} mentioned @${mentioned.username ?? mentioned.name}`,
          body: preview,
          conversationId,
          messageId: created.id,
          createdAt,
          fromUserId: currentUser.id,
          fromUserName: currentUser.name,
        });
      }
    });

    socket.on(SOCKET_EVENTS.TYPING_START, async ({ conversationId }) => {
      if (!(await isMember(conversationId, currentUser.id))) {
        return;
      }
      socket.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.TYPING_START, {
        conversationId,
        userId: currentUser.id,
        userName: currentUser.name,
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, async ({ conversationId }) => {
      if (!(await isMember(conversationId, currentUser.id))) {
        return;
      }
      socket.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.TYPING_STOP, {
        conversationId,
        userId: currentUser.id,
        userName: currentUser.name,
      });
    });
  });

  return io;
}

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
