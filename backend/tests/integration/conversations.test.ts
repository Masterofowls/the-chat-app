import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app.js";
import { createTestDb, createTestPool, hasDatabaseUrl } from "../helpers/testDb.js";
import { insertTestUser } from "../helpers/testUser.js";

const describeIfDb = hasDatabaseUrl() ? describe : describe.skip;

describeIfDb("conversation routes", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(() => {
    db = createTestDb(createTestPool());
  });

  it("rejects unauthenticated conversation creation", async () => {
    const response = await request(app).post("/conversations/direct").send({
      email: "peer@relay.test",
    });
    expect(response.status).toBe(401);
  });

  it("creates a direct conversation and returns message history", async () => {
    const alice = await insertTestUser(db, { name: "Alice", email: "alice@relay.test" });
    const bob = await insertTestUser(db, { name: "Bob", email: "bob@relay.test" });

    const created = await request(app)
      .post("/conversations/direct")
      .set("Cookie", alice.cookie)
      .send({ userId: bob.id });

    expect(created.status).toBe(201);
    expect(created.body.conversation.id).toEqual(expect.any(String));
    expect(created.body.conversation.participants).toHaveLength(2);

    const again = await request(app)
      .post("/conversations/direct")
      .set("Cookie", alice.cookie)
      .send({ email: bob.email });

    expect(again.status).toBe(200);
    expect(again.body.conversation.id).toBe(created.body.conversation.id);

    const history = await request(app)
      .get(`/conversations/${created.body.conversation.id}/messages`)
      .set("Cookie", alice.cookie);

    expect(history.status).toBe(200);
    expect(history.body.messages).toEqual([]);
  });

  it("blocks message history for non-members", async () => {
    const alice = await insertTestUser(db, { email: "alice2@relay.test" });
    const bob = await insertTestUser(db, { email: "bob2@relay.test" });
    const eve = await insertTestUser(db, { email: "eve@relay.test" });

    const created = await request(app)
      .post("/conversations/direct")
      .set("Cookie", alice.cookie)
      .send({ userId: bob.id });

    const blocked = await request(app)
      .get(`/conversations/${created.body.conversation.id}/messages`)
      .set("Cookie", eve.cookie);

    expect(blocked.status).toBe(403);
  });
});
