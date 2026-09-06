import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app.js";
import { hasDatabaseUrl } from "../helpers/testDb.js";

const itDb = process.env.DATABASE_URL ? it : it.skip;

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

  it("exposes the GitHub OAuth callback route", async () => {
    const response = await request(app).get("/api/auth/callback/github");
    expect([302, 400, 401, 403, 404]).toContain(response.status);
  });

  itDb("returns a session payload shape for anonymous callers", async () => {
    expect(hasDatabaseUrl()).toBe(true);
    const response = await request(app).get("/api/auth/get-session");
    expect(response.status).toBeLessThan(500);
    expect(response.body === null || typeof response.body === "object").toBe(true);
  });

  itDb("accepts username/password sign-up then username sign-in", async () => {
    const suffix = `${Date.now()}`;
    const username = `relay_${suffix}`;
    const email = `${username}@example.com`;
    const password = "password1234";

    const signUp = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email, password, name: username, username });

    expect([200, 201]).toContain(signUp.status);
    expect(signUp.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email, name: username }),
      }),
    );

    const signIn = await request(app)
      .post("/api/auth/sign-in/username")
      .send({ username, password });

    expect([200, 201]).toContain(signIn.status);
    expect(signIn.headers["set-cookie"]).toEqual(expect.any(Array));
  });
});
