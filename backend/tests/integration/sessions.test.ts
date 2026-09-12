import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestDb, createTestPool, hasDatabaseUrl } from "../helpers/testDb.js";
import { insertTestUser } from "../helpers/testUser.js";

const describeIfDb = hasDatabaseUrl() ? describe : describe.skip;

describeIfDb("session routes", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(() => {
    db = createTestDb(createTestPool());
  });

  it("lists the current session without a freshness check", async () => {
    const alice = await insertTestUser(db, { email: "sessions-alice@relay.test" });

    const response = await request(app).get("/me/sessions").set("Cookie", alice.cookie);

    expect(response.status).toBe(200);
    expect(response.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          current: true,
        }),
      ]),
    );
    expect(response.body.sessions[0].token).toBeUndefined();
  });

  it("rejects unauthenticated session listing", async () => {
    const response = await request(app).get("/me/sessions");
    expect(response.status).toBe(401);
  });

  it("refuses to revoke the current session", async () => {
    const alice = await insertTestUser(db, { email: "sessions-revoke-self@relay.test" });
    const listed = await request(app).get("/me/sessions").set("Cookie", alice.cookie);
    const currentId = listed.body.sessions[0].id as string;

    const response = await request(app)
      .post("/me/sessions/revoke")
      .set("Cookie", alice.cookie)
      .send({ id: currentId });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/current session/i);
  });
});
