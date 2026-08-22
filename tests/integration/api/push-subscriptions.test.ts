import { app } from "$/server";
import { db } from "$/utils/db";
import { describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";

describe("POST /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post("/api/push-subscriptions")
      .send({
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      })
      .expect(401);
  });

  it("creates a subscription for the logged in user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });

    await request(app)
      .post("/api/push-subscriptions")
      .send({
        endpoint: "https://push.example.com/create-test",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      })
      .set("Cookie", await getAuthCookies())
      .set("User-Agent", "Mozilla/5.0 test-agent")
      .expect(201);

    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: "https://push.example.com/create-test" },
    });
    expect(subscription?.userId).toBe(user!.id);
    expect(subscription?.p256dh).toBe("p256dh-key");
    expect(subscription?.auth).toBe("auth-key");
    expect(subscription?.userAgent).toBe("Mozilla/5.0 test-agent");
  });

  it("upserts rather than erroring on a duplicate endpoint", async () => {
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/upsert-test",
        p256dh: "old-p256dh",
        auth: "old-auth",
        userId: (await db.user.findUnique({
          where: { email: "user@test.com" },
        }))!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions")
      .send({
        endpoint: "https://push.example.com/upsert-test",
        keys: { p256dh: "new-p256dh", auth: "new-auth" },
      })
      .set("Cookie", await getAuthCookies())
      .expect(201);

    const subscriptions = await db.pushSubscription.findMany({
      where: { endpoint: "https://push.example.com/upsert-test" },
    });
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.p256dh).toBe("new-p256dh");
  });

  it("rejects an invalid endpoint", async () => {
    await request(app)
      .post("/api/push-subscriptions")
      .send({ endpoint: "not-a-url", keys: { p256dh: "a", auth: "b" } })
      .set("Cookie", await getAuthCookies())
      .expect(400);
  });
});

describe("DELETE /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .delete("/api/push-subscriptions")
      .send({ endpoint: "https://push.example.com/abc" })
      .expect(401);
  });

  it("returns 404 for a nonexistent endpoint", async () => {
    await request(app)
      .delete("/api/push-subscriptions")
      .send({ endpoint: "https://push.example.com/does-not-exist" })
      .set("Cookie", await getAuthCookies())
      .expect(404);
  });

  it("returns 404 for another user's subscription and does not delete it", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/other-user",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user2!.id,
      },
    });

    await request(app)
      .delete("/api/push-subscriptions")
      .send({ endpoint: "https://push.example.com/other-user" })
      .set("Cookie", await getAuthCookies())
      .expect(404);

    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: "https://push.example.com/other-user" },
    });
    expect(subscription).not.toBeNull();
  });

  it("deletes the requesting user's own subscription", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/delete-test",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user!.id,
      },
    });

    await request(app)
      .delete("/api/push-subscriptions")
      .send({ endpoint: "https://push.example.com/delete-test" })
      .set("Cookie", await getAuthCookies())
      .expect(200);

    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: "https://push.example.com/delete-test" },
    });
    expect(subscription).toBeNull();
  });
});

describe("POST /ack", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post("/api/push-subscriptions/ack")
      .send({ endpoint: "https://push.example.com/abc" })
      .expect(401);
  });

  it("returns 404 for a nonexistent endpoint", async () => {
    await request(app)
      .post("/api/push-subscriptions/ack")
      .send({ endpoint: "https://push.example.com/does-not-exist" })
      .set("Cookie", await getAuthCookies())
      .expect(404);
  });

  it("returns 404 for another user's subscription and does not ack it", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/ack-other-user",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user2!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions/ack")
      .send({ endpoint: "https://push.example.com/ack-other-user" })
      .set("Cookie", await getAuthCookies())
      .expect(404);

    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: "https://push.example.com/ack-other-user" },
    });
    expect(subscription?.lastAckedAt).toBeNull();
  });

  it("bumps lastAckedAt for the requesting user's own subscription", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/ack-test",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions/ack")
      .send({ endpoint: "https://push.example.com/ack-test" })
      .set("Cookie", await getAuthCookies())
      .expect(200);

    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: "https://push.example.com/ack-test" },
    });
    expect(subscription?.lastAckedAt).not.toBeNull();
  });

  it("marks the matching CommunicationAuditLog row acknowledged when notificationId is provided", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/ack-with-notification-id",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user!.id,
      },
    });
    const auditLog = await db.communicationAuditLog.create({
      data: {
        communicationType: "push",
        to: "https://push.example.com/ack-with-notification-id",
        userId: user!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions/ack")
      .send({
        endpoint: "https://push.example.com/ack-with-notification-id",
        notificationId: auditLog.id,
      })
      .set("Cookie", await getAuthCookies())
      .expect(200);

    const updatedAuditLog = await db.communicationAuditLog.findUnique({
      where: { id: auditLog.id },
    });
    expect(updatedAuditLog?.acknowledgedAt).not.toBeNull();
  });

  it("still acks the subscription when notificationId is omitted or unmatched", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/ack-no-notification-id",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions/ack")
      .send({
        endpoint: "https://push.example.com/ack-no-notification-id",
        notificationId: "does-not-exist",
      })
      .set("Cookie", await getAuthCookies())
      .expect(200);

    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: "https://push.example.com/ack-no-notification-id" },
    });
    expect(subscription?.lastAckedAt).not.toBeNull();
  });
});

describe("POST /check", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post("/api/push-subscriptions/check")
      .send({ endpoint: "https://push.example.com/abc" })
      .expect(401);
  });

  it("returns 404 for a nonexistent endpoint", async () => {
    await request(app)
      .post("/api/push-subscriptions/check")
      .send({ endpoint: "https://push.example.com/does-not-exist" })
      .set("Cookie", await getAuthCookies())
      .expect(404);
  });

  it("returns 404 for another user's subscription", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/check-other-user",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user2!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions/check")
      .send({ endpoint: "https://push.example.com/check-other-user" })
      .set("Cookie", await getAuthCookies())
      .expect(404);
  });

  it("returns 200 for the owner's own subscription", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/check-test",
        p256dh: "p256dh-key",
        auth: "auth-key",
        userId: user!.id,
      },
    });

    await request(app)
      .post("/api/push-subscriptions/check")
      .send({ endpoint: "https://push.example.com/check-test" })
      .set("Cookie", await getAuthCookies())
      .expect(200);
  });
});
