import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { session } from "../db/schema.js";
import { asAuthed, requireSession } from "../middleware/requireSession.js";

export const sessionsRouter = Router();
sessionsRouter.use(requireSession);

sessionsRouter.get("/me/sessions", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const rows = await db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt,
      })
      .from(session)
      .where(eq(session.userId, authed.user.id))
      .orderBy(desc(session.updatedAt));

    const now = Date.now();
    res.json({
      sessions: rows
        .filter((row) => row.expiresAt.getTime() > now)
        .map((row) => ({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          userAgent: row.userAgent,
          ipAddress: row.ipAddress,
          current: row.id === authed.sessionId,
        })),
    });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.post("/me/sessions/revoke", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const parsed = z.object({ id: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Session id required" });
      return;
    }
    if (parsed.data.id === authed.sessionId) {
      res.status(400).json({ error: "Cannot revoke the current session" });
      return;
    }

    const deleted = await db
      .delete(session)
      .where(and(eq(session.id, parsed.data.id), eq(session.userId, authed.user.id)))
      .returning({ id: session.id });

    if (!deleted[0]) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
