import { eq } from "drizzle-orm";
import { Telegraf } from "telegraf";
import { env } from "../config.js";
import { db } from "../db/index.js";
import { telegramLinks } from "../db/schema.js";

type OtpSender = (chatId: string, code: string) => Promise<void>;

let bot: Telegraf | null = null;
let otpSender: OtpSender | null = null;

function createDefaultSender(instance: Telegraf): OtpSender {
  return async (chatId, code) => {
    await instance.telegram.sendMessage(
      chatId,
      `Your Relay verification code is ${code}. It expires in 5 minutes.`,
    );
  };
}

export function getBot(): Telegraf | null {
  return bot;
}

export function setOtpSender(sender: OtpSender | null): void {
  otpSender = sender;
}

export function createBot(): Telegraf | null {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return null;
  }

  bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  otpSender = createDefaultSender(bot);

  bot.start(async (ctx) => {
    const token = ctx.message.text.split(" ")[1];
    const chatId = String(ctx.chat.id);

    if (!token) {
      await ctx.reply(
        "Open Relay and generate a Telegram link first, then tap the deep link.",
      );
      return;
    }

    const [link] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.linkToken, token))
      .limit(1);

    if (!link) {
      await ctx.reply("That link token is invalid or expired. Generate a new one in Relay.");
      return;
    }

    await db
      .update(telegramLinks)
      .set({ telegramChatId: chatId, updatedAt: new Date() })
      .where(eq(telegramLinks.id, link.id));

    await ctx.reply("Telegram is linked to your Relay account. You can request OTPs now.");
  });

  return bot;
}

export async function sendOtp(chatId: string, code: string): Promise<void> {
  if (!otpSender) {
    throw new Error("Telegram OTP sender is not configured");
  }

  await otpSender(chatId, code);
}

export async function launchBot(): Promise<void> {
  if (!bot) {
    return;
  }

  await bot.launch({ dropPendingUpdates: true });
}

export async function stopBot(): Promise<void> {
  if (!bot) {
    return;
  }

  bot.stop("shutdown");
}
