import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import type { AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { app } from "../../src/app.js";
import { SOCKET_EVENTS } from "../../src/realtime/events.js";
import { initSocket } from "../../src/realtime/socket.js";
import { createTestDb, createTestPool, hasDatabaseUrl } from "../helpers/testDb.js";
import { insertTestUser } from "../helpers/testUser.js";
import request from "supertest";

const describeIfDb = hasDatabaseUrl() ? describe : describe.skip;

describeIfDb("socket messaging", () => {
  let db: ReturnType<typeof createTestDb>;
  const httpServer = createServer(app);
  let baseUrl = "";

  beforeAll(async () => {
    db = createTestDb(createTestPool());
    initSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  });

  function connect(cookie: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioc(baseUrl, {
        extraHeaders: { cookie },
        transports: ["websocket"],
        forceNew: true,
      });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (error) => reject(error));
    });
  }

  it("joins a room, delivers a message, and rejects non-members", async () => {
    const alice = await insertTestUser(db, { name: "Alice", email: "sock-alice@relay.test" });
    const bob = await insertTestUser(db, { name: "Bob", email: "sock-bob@relay.test" });
    const eve = await insertTestUser(db, { name: "Eve", email: "sock-eve@relay.test" });

    const created = await request(app)
      .post("/conversations/direct")
      .set("Cookie", alice.cookie)
      .send({ userId: bob.id });

    const conversationId = created.body.conversation.id as string;
    const aliceSocket = await connect(alice.cookie);
    const bobSocket = await connect(bob.cookie);
    const eveSocket = await connect(eve.cookie);

    const received = new Promise((resolve) => {
      bobSocket.on(SOCKET_EVENTS.MESSAGE_NEW, resolve);
    });

    const rejected = new Promise((resolve) => {
      eveSocket.on(SOCKET_EVENTS.ERROR, resolve);
    });

    aliceSocket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
    bobSocket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
    eveSocket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });

    await new Promise((resolve) => setTimeout(resolve, 50));

    aliceSocket.emit(SOCKET_EVENTS.MESSAGE_SEND, {
      conversationId,
      body: "hello from alice",
    });

    const message = await received;
    const error = await rejected;

    expect(message).toEqual(
      expect.objectContaining({
        body: "hello from alice",
        senderId: alice.id,
        conversationId,
      }),
    );
    expect(error).toEqual(
      expect.objectContaining({
        code: "FORBIDDEN",
      }),
    );

    aliceSocket.close();
    bobSocket.close();
    eveSocket.close();
  });

  it("supports replies, @mentions, typing, and notifications", async () => {
    const alice = await insertTestUser(db, {
      name: "Alice Ping",
      email: "ping-alice@relay.test",
      username: "aliceping",
    });
    const bob = await insertTestUser(db, {
      name: "Bob Ping",
      email: "ping-bob@relay.test",
      username: "bobping",
    });

    const created = await request(app)
      .post("/conversations/direct")
      .set("Cookie", alice.cookie)
      .send({ userId: bob.id });
    const conversationId = created.body.conversation.id as string;

    const aliceSocket = await connect(alice.cookie);
    const bobSocket = await connect(bob.cookie);

    const firstMessage = new Promise<{ id: string }>((resolve) => {
      bobSocket.on(SOCKET_EVENTS.MESSAGE_NEW, resolve);
    });
    const typing = new Promise((resolve) => {
      bobSocket.on(SOCKET_EVENTS.TYPING_START, resolve);
    });
    const notification = new Promise((resolve) => {
      bobSocket.on(SOCKET_EVENTS.NOTIFICATION_NEW, resolve);
    });

    aliceSocket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
    bobSocket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
    await new Promise((resolve) => setTimeout(resolve, 40));

    aliceSocket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
    await typing;

    aliceSocket.emit(SOCKET_EVENTS.MESSAGE_SEND, {
      conversationId,
      body: "first note",
    });
    const root = await firstMessage;

    const replied = new Promise((resolve) => {
      bobSocket.on(SOCKET_EVENTS.MESSAGE_NEW, resolve);
    });
    aliceSocket.emit(SOCKET_EVENTS.MESSAGE_SEND, {
      conversationId,
      body: "hey @bobping check this",
      replyToId: root.id,
    });

    const message = await replied;
    const note = await notification;

    expect(message).toEqual(
      expect.objectContaining({
        body: "hey @bobping check this",
        replyToId: root.id,
        replyTo: expect.objectContaining({ id: root.id, body: "first note" }),
        mentions: expect.arrayContaining([bob.id]),
      }),
    );
    expect(note).toEqual(
      expect.objectContaining({
        type: expect.stringMatching(/mention|reply|message/),
        conversationId,
        fromUserId: alice.id,
      }),
    );

    aliceSocket.close();
    bobSocket.close();
  });
});
