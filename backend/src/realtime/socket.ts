import type { Server as HttpServer } from "node:http";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../../shared/types.js";
import { allowedOrigins } from "../config.js";
import { db } from "../db/index.js";
import { conversations, messages, participants, user } from "../db/schema.js";
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

export function initSocket(httpServer: HttpServer): AppSocketServer {
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: allowedOrigins,
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

    socket.on(SOCKET_EVENTS.MESSAGE_SEND, async ({ conversationId, body }) => {
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

      const now = new Date();
      const [created] = await db
        .insert(messages)
        .values({
          id: randomUUID(),
          conversationId,
          senderId: currentUser.id,
          body: trimmed,
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

      const payload = {
        id: created.id,
        conversationId: created.conversationId,
        senderId: created.senderId,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        sender: currentUser,
      };

      io?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.MESSAGE_NEW, payload);
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
