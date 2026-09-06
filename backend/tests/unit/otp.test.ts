import { describe, expect, it } from "@jest/globals";
import { generateOtp, storeOtp, verifyOtp } from "../../src/telegram/otp.js";
import { createTestDb, createTestPool, hasDatabaseUrl } from "../helpers/testDb.js";
import { insertTestUser } from "../helpers/testUser.js";

describe("generateOtp", () => {
  it("returns a 6-digit numeric string", () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("produces varying codes", () => {
    const codes = new Set(Array.from({ length: 8 }, () => generateOtp()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

const describeIfDb = hasDatabaseUrl() ? describe : describe.skip;

describeIfDb("storeOtp / verifyOtp", () => {
  const db = () => createTestDb(createTestPool());

  it("stores a hashed code and verifies it once", async () => {
    const user = await insertTestUser(db());
    const code = generateOtp();
    const id = await storeOtp(user.id, code);

    expect(id).toEqual(expect.any(String));
    expect(await verifyOtp(user.id, code)).toBe(true);
    expect(await verifyOtp(user.id, code)).toBe(false);
  });

  it("rejects an incorrect code", async () => {
    const user = await insertTestUser(db());
    await storeOtp(user.id, "123456");
    expect(await verifyOtp(user.id, "000000")).toBe(false);
  });
});
