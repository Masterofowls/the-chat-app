import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config.js";
import { db } from "../db/index.js";
import { telegramLinks } from "../db/schema.js";
import { asAuthed, requireSession } from "../middleware/requireSession.js";
import { sendOtp } from "../telegram/bot.js";
import { generateOtp, storeOtp, verifyOtp } from "../telegram/otp.js";

export const telegramOtpRouter = Router();

telegramOtpRouter.use(requireSession);

telegramOtpRouter.post("/link", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const token = randomBytes(16).toString("hex");
    const now = new Date();

    const [existing] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, authed.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(telegramLinks)
        .set({ linkToken: token, updatedAt: now })
        .where(eq(telegramLinks.id, existing.id));
    } else {
      await db.insert(telegramLinks).values({
        id: randomUUID(),
        userId: authed.user.id,
        linkToken: token,
        createdAt: now,
        updatedAt: now,
      });
    }

    const botName = env.BOT_USERNAME || "your_bot";
    const deepLink = `https://t.me/${botName}?start=${token}`;

    res.json({
      token,
      deepLink,
      linked: Boolean(existing?.telegramChatId),
    });
  } catch (error) {
    next(error);
  }
});

telegramOtpRouter.post("/send", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const [link] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, authed.user.id))
      .limit(1);

    if (!link?.telegramChatId) {
      res.status(400).json({ error: "Telegram is not linked yet" });
      return;
    }

    const code = generateOtp();
    await storeOtp(authed.user.id, code);
    await sendOtp(link.telegramChatId, code);

    res.json({ sent: true });
  } catch (error) {
    next(error);
  }
});

telegramOtpRouter.post("/verify", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const parsed = z.object({ code: z.string().min(4).max(12) }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "A verification code is required" });
      return;
    }

    const ok = await verifyOtp(authed.user.id, parsed.data.code);
    if (!ok) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    res.json({ verified: true });
  } catch (error) {
    next(error);
  }
});

telegramOtpRouter.get("/status", async (req, res, next) => {
  try {
    const authed = asAuthed(req);
    const [link] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, authed.user.id))
      .limit(1);

    res.json({
      linked: Boolean(link?.telegramChatId),
      botUsername: env.BOT_USERNAME || null,
    });
  } catch (error) {
    next(error);
  }
});
