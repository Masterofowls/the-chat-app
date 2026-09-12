import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestDb, createTestPool, hasDatabaseUrl } from "../helpers/testDb.js";
import { insertTestUser } from "../helpers/testUser.js";

const describeIfDb = hasDatabaseUrl() ? describe : describe.skip;

describeIfDb("profile routes", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(() => {
    db = createTestDb(createTestPool());
  });

  it("serves a public profile without a session and hides email", async () => {
    const alice = await insertTestUser(db, {
      name: "Alice Public",
      email: "alice-public@relay.test",
      username: "alicepublic",
    });

    const response = await request(app).get(`/users/${alice.id}/profile`);

    expect(response.status).toBe(200);
    expect(response.body.profile.id).toBe(alice.id);
    expect(response.body.profile.name).toBe("Alice Public");
    expect(response.body.profile.username).toBe("alicepublic");
    expect(response.body.profile.email).toBe("");
  });

  it("still requires a session to edit a profile", async () => {
    const response = await request(app).patch("/me/profile").send({ name: "Nope" });
    expect(response.status).toBe(401);
  });
});
