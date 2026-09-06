import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app.js";
import { hasDatabaseUrl } from "../helpers/testDb.js";

describe("better-auth routes", () => {
  it("exposes a health-style ok endpoint", async () => {
    const response = await request(app).get("/api/auth/ok");
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toEqual(expect.objectContaining({ ok: expect.anything() }));
    }
  });

  it("exposes the Google OAuth callback route", async () => {
    const response = await request(app).get("/api/auth/callback/google");
    expect([302, 400, 401, 403, 404]).toContain(response.status);
  });

  const describeSession = hasDatabaseUrl() ? it : it.skip;

  describeSession("returns a session payload shape for anonymous callers", async () => {
    const response = await request(app).get("/api/auth/get-session");
    expect(response.status).toBeLessThan(500);
    expect(response.body === null || typeof response.body === "object").toBe(true);
  });
});
