import bcrypt from "bcryptjs";
import { randomInt, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { otpCodes } from "../db/schema.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export async function storeOtp(userId: string, code: string): Promise<string> {
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const id = randomUUID();

  await db.insert(otpCodes).values({
    id,
    userId,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return id;
}

export async function verifyOtp(userId: string, code: string): Promise<boolean> {
  const candidates = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, userId), isNull(otpCodes.consumedAt)));

  const now = Date.now();

  for (const row of candidates) {
    if (row.expiresAt.getTime() < now) {
      continue;
    }

    const matches = await bcrypt.compare(code, row.codeHash);
    if (!matches) {
      continue;
    }

    await db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodes.id, row.id));

    return true;
  }

  return false;
}
