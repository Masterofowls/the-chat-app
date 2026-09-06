import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { UserProfile } from "../../../shared/types.js";
import { db } from "../db/index.js";
import { session, user } from "../db/schema.js";
import { parseDeviceInfo } from "../lib/device.js";
import { asAuthed, requireSession } from "../middleware/requireSession.js";
import { isUserOnline } from "../presence.js";

export const profileRouter = Router();

profileRouter.use(requireSession);

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  customStatus: z.string().max(80).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  showLastActive: z.boolean().optional(),
  showDeviceInfo: z.boolean().optional(),
  image: z.string().max(900_000).nullable().optional(),
});

profileRouter.get("/me/profile", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const profile = await buildProfile(authed.user.id, true);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/me/profile", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid profile payload" });
      return;
    }

    if (parsed.data.image && !parsed.data.image.startsWith("data:image/jpeg")) {
      res.status(400).json({ error: "Avatar must be a JPEG data URL" });
      return;
    }

    await db
      .update(user)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.customStatus !== undefined
          ? { customStatus: parsed.data.customStatus }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.showLastActive !== undefined
          ? { showLastActive: parsed.data.showLastActive }
          : {}),
        ...(parsed.data.showDeviceInfo !== undefined
          ? { showDeviceInfo: parsed.data.showDeviceInfo }
          : {}),
        ...(parsed.data.image !== undefined ? { image: parsed.data.image } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, authed.user.id));

    const profile = await buildProfile(authed.user.id, true);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/users/:id/profile", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const userId = req.params.id;
    if (!userId) {
      res.status(400).json({ error: "User id required" });
      return;
    }
    const profile = await buildProfile(userId, userId === authed.user.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

async function latestDevice(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ userAgent: session.userAgent })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.updatedAt))
    .limit(1);
  return row?.userAgent ? parseDeviceInfo(row.userAgent) : null;
}

async function buildProfile(userId: string, isSelf: boolean): Promise<UserProfile | null> {
  const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!row) {
    return null;
  }

  const online = isUserOnline(userId);
  const device = await latestDevice(userId);
  const canSeeLast = isSelf || row.showLastActive;
  const canSeeDevice = isSelf || row.showDeviceInfo;

  return {
    id: row.id,
    name: row.name,
    email: isSelf ? row.email : "",
    image: row.image,
    username: row.username,
    customStatus: row.customStatus,
    description: row.description,
    isOnline: online,
    lastActiveAt: canSeeLast ? (row.lastActiveAt?.toISOString() ?? null) : null,
    deviceInfo: canSeeDevice ? device : null,
    showLastActive: row.showLastActive,
    showDeviceInfo: row.showDeviceInfo,
  };
}
