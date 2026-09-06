import { beforeAll, describe, expect, it } from "@jest/globals";
import { eq } from "drizzle-orm";
import request from "supertest";
import { app } from "../../src/app.js";
import { telegramLinks } from "../../src/db/schema.js";
import { setOtpSender } from "../../src/telegram/bot.js";
import { createTestDb, createTestPool, hasDatabaseUrl } from "../helpers/testDb.js";
import { insertTestUser } from "../helpers/testUser.js";

const describeIfDb = hasDatabaseUrl() ? describe : describe.skip;

describeIfDb("telegram otp routes", () => {
  let db: ReturnType<typeof createTestDb>;
  const sent: Array<{ chatId: string; code: string }> = [];

  beforeAll(() => {
    db = createTestDb(createTestPool());
    setOtpSender(async (chatId, code) => {
      sent.push({ chatId, code });
    });
  });

  it("rejects unauthenticated link requests", async () => {
    const response = await request(app).post("/telegram/link");
    expect(response.status).toBe(401);
  });

  it("creates a Telegram deep link for the current user", async () => {
    const user = await insertTestUser(db);
    const response = await request(app)
      .post("/telegram/link")
      .set("Cookie", user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.deepLink).toMatch(/^https:\/\/t\.me\//);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it("refuses to send an OTP before Telegram is linked", async () => {
    const user = await insertTestUser(db);
    await request(app).post("/telegram/link").set("Cookie", user.cookie);

    const response = await request(app)
      .post("/telegram/send")
      .set("Cookie", user.cookie);

    expect(response.status).toBe(400);
  });

  it("sends and verifies a Telegram OTP after linking", async () => {
    const user = await insertTestUser(db);
    await request(app).post("/telegram/link").set("Cookie", user.cookie);

    await db
      .update(telegramLinks)
      .set({ telegramChatId: "123456" })
      .where(eq(telegramLinks.userId, user.id));

    const send = await request(app).post("/telegram/send").set("Cookie", user.cookie);
    expect(send.status).toBe(200);
    expect(sent.at(-1)?.chatId).toBe("123456");

    const code = sent.at(-1)?.code;
    expect(code).toMatch(/^\d{6}$/);

    const verify = await request(app)
      .post("/telegram/verify")
      .set("Cookie", user.cookie)
      .send({ code });

    expect(verify.status).toBe(200);
    expect(verify.body.verified).toBe(true);
  });
});
