import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { auth } from "../auth.js";
import { env } from "../config.js";
import { db } from "../db/index.js";
import { account, user } from "../db/schema.js";
import { asAuthed, requireSession, resolveSession } from "../middleware/requireSession.js";

export const telegramWidgetRouter = Router();

const widgetSchema = z.object({
  id: z.union([z.number(), z.string()]),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.union([z.number(), z.string()]),
  hash: z.string().min(1),
});

function verifyTelegramLogin(payload: z.infer<typeof widgetSchema>): boolean {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return false;
  }

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "hash" || value === undefined || value === null) {
      continue;
    }
    data[key] = String(value);
  }

  const checkString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(checkString).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(payload.hash, "hex"));
  } catch {
    return false;
  }
}

async function setSessionCookie(res: import("express").Response, sessionToken: string) {
  const isProd = env.NODE_ENV === "production";
  const parts = [
    `better-auth.session_token=${encodeURIComponent(sessionToken)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${60 * 60 * 24 * 7}`,
    isProd ? "SameSite=None" : "SameSite=Lax",
  ];
  if (isProd) {
    parts.push("Secure");
  }
  res.append("Set-Cookie", parts.join("; "));
}

telegramWidgetRouter.get("/widget/config", (_req, res) => {
  res.json({
    botUsername: env.BOT_USERNAME || null,
    enabled: Boolean(env.TELEGRAM_BOT_TOKEN && env.BOT_USERNAME),
  });
});

telegramWidgetRouter.post("/widget/signin", async (req, res, next) => {
  try {
    const parsed = widgetSchema.safeParse(req.body);
    if (!parsed.success || !verifyTelegramLogin(parsed.data)) {
      res.status(401).json({ error: "Invalid Telegram login payload" });
      return;
    }

    const telegramId = String(parsed.data.id);
    const displayName = [parsed.data.first_name, parsed.data.last_name].filter(Boolean).join(" ");
    const now = new Date();

    let [existing] = await db.select().from(user).where(eq(user.telegramId, telegramId)).limit(1);

    if (!existing) {
      const userId = randomUUID();
      const email = `telegram_${telegramId}@users.relay.local`;
      await db.insert(user).values({
        id: userId,
        name: displayName || parsed.data.username || "Telegram user",
        email,
        emailVerified: true,
        image: parsed.data.photo_url ?? null,
        username: parsed.data.username
          ? `tg_${parsed.data.username}`.toLowerCase().slice(0, 32)
          : `tg_${telegramId}`.slice(0, 32),
        displayUsername: parsed.data.username ?? null,
        telegramId,
        telegramUsername: parsed.data.username ?? null,
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
      });

      await db.insert(account).values({
        id: randomUUID(),
        accountId: telegramId,
        providerId: "telegram",
        userId,
        createdAt: now,
        updatedAt: now,
      });

      [existing] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    } else {
      await db
        .update(user)
        .set({
          name: displayName || existing.name,
          image: parsed.data.photo_url ?? existing.image,
          telegramUsername: parsed.data.username ?? existing.telegramUsername,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(user.id, existing.id));
    }

    if (!existing) {
      res.status(500).json({ error: "Could not create Telegram user" });
      return;
    }

    const context = await auth.$context;
    const session = await context.internalAdapter.createSession(existing.id, false);
    if (!session) {
      res.status(500).json({ error: "Could not create session" });
      return;
    }

    await setSessionCookie(res, session.token);
    res.json({
      user: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        image: existing.image,
      },
    });
  } catch (error) {
    next(error);
  }
});

telegramWidgetRouter.post("/widget/link", requireSession, async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const parsed = widgetSchema.safeParse(req.body);
    if (!parsed.success || !verifyTelegramLogin(parsed.data)) {
      res.status(401).json({ error: "Invalid Telegram login payload" });
      return;
    }

    const telegramId = String(parsed.data.id);
    const [taken] = await db.select().from(user).where(eq(user.telegramId, telegramId)).limit(1);
    if (taken && taken.id !== authed.user.id) {
      res.status(409).json({ error: "That Telegram account is already linked" });
      return;
    }

    await db
      .update(user)
      .set({
        telegramId,
        telegramUsername: parsed.data.username ?? null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, authed.user.id));

    const [existingAccount] = await db
      .select()
      .from(account)
      .where(eq(account.userId, authed.user.id))
      .limit(50);

    const hasTelegramAccount = (
      await db.select().from(account).where(eq(account.userId, authed.user.id))
    ).some((row) => row.providerId === "telegram");

    if (!hasTelegramAccount) {
      await db.insert(account).values({
        id: randomUUID(),
        accountId: telegramId,
        providerId: "telegram",
        userId: authed.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    void existingAccount;
    res.json({ linked: true, telegramId, telegramUsername: parsed.data.username ?? null });
  } catch (error) {
    next(error);
  }
});

telegramWidgetRouter.post("/widget/unlink", requireSession, async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    await db
      .update(user)
      .set({ telegramId: null, telegramUsername: null, updatedAt: new Date() })
      .where(eq(user.id, authed.user.id));

    const accounts = await db.select().from(account).where(eq(account.userId, authed.user.id));
    for (const row of accounts) {
      if (row.providerId === "telegram") {
        await db.delete(account).where(eq(account.id, row.id));
      }
    }

    res.json({ linked: false });
  } catch (error) {
    next(error);
  }
});

telegramWidgetRouter.get("/widget/status", async (req, res, next) => {
  try {
    const session = await resolveSession(req.headers);
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [row] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    res.json({
      linked: Boolean(row?.telegramId),
      telegramId: row?.telegramId ?? null,
      telegramUsername: row?.telegramUsername ?? null,
      botUsername: env.BOT_USERNAME || null,
      enabled: Boolean(env.TELEGRAM_BOT_TOKEN && env.BOT_USERNAME),
    });
  } catch (error) {
    next(error);
  }
});
