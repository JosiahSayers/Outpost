import { app } from "$/server";
import { db } from "$/utils/db";
import { describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/api/notifications").expect(401);
  });

  it("returns the notifications for the logged in user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", {
        userId: user!.id,
        title: "Trip reminder",
      }),
    });

    const response = await request(app)
      .get("/api/notifications")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.notifications).toEqual([
      {
        id: notification.id,
        title: "Trip reminder",
        description: notification.description,
        read: notification.read,
        dismissed: notification.dismissed,
        icon: notification.icon,
        referenceUrl: notification.referenceUrl,
        createdAt: notification.createdAt.toISOString(),
      },
    ]);
  });

  it("does not return user 1's notifications for user 2", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.create({
      data: make("Notification", { userId: user!.id }),
    });

    const response = await request(app)
      .get("/api/notifications")
      .set("Cookie", await getAuthCookies("user2@test.com"))
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      notifications: [],
      pageSize: 5,
      total: 0,
    });
  });

  it("does not leak internal fields", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.create({
      data: make("Notification", { userId: user!.id }),
    });

    const response = await request(app)
      .get("/api/notifications")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications[0]).not.toHaveProperty("userId");
    expect(response.body.notifications[0]).not.toHaveProperty("updatedAt");
  });

  it("returns the total count and page size alongside the notifications, regardless of take/skip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: Array.from({ length: 5 }, () =>
        make("Notification", { userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/notifications?take=2")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications).toHaveLength(2);
    expect(response.body.total).toBe(5);
    expect(response.body.pageSize).toBe(2);
  });

  it("defaults to returning at most 5 notifications", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: Array.from({ length: 7 }, () =>
        make("Notification", { userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/notifications")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications).toHaveLength(5);
    expect(response.body.pageSize).toBe(5);
  });

  it("respects a provided take parameter", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: Array.from({ length: 5 }, () =>
        make("Notification", { userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/notifications?take=3")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications).toHaveLength(3);
  });

  it("orders notifications by createdAt descending", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: [
        make("Notification", {
          userId: user!.id,
          title: "First",
          createdAt: new Date("2026-01-01"),
        }),
        make("Notification", {
          userId: user!.id,
          title: "Second",
          createdAt: new Date("2026-01-02"),
        }),
        make("Notification", {
          userId: user!.id,
          title: "Third",
          createdAt: new Date("2026-01-03"),
        }),
      ],
    });

    const response = await request(app)
      .get("/api/notifications?take=25")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications.map((n: any) => n.title)).toEqual([
      "Third",
      "Second",
      "First",
    ]);
  });

  it("respects a provided skip parameter", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: [
        make("Notification", {
          userId: user!.id,
          title: "First",
          createdAt: new Date("2026-01-01"),
        }),
        make("Notification", {
          userId: user!.id,
          title: "Second",
          createdAt: new Date("2026-01-02"),
        }),
        make("Notification", {
          userId: user!.id,
          title: "Third",
          createdAt: new Date("2026-01-03"),
        }),
      ],
    });

    const response = await request(app)
      .get("/api/notifications?take=25&skip=1")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications.map((n: any) => n.title)).toEqual([
      "Second",
      "First",
    ]);
  });

  it("returns a validation error when take exceeds the maximum", async () => {
    const response = await request(app)
      .get("/api/notifications?take=100")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_big",
              "inclusive": true,
              "maximum": 25,
              "message": "Too big: expected number to be <=25",
              "origin": "number",
              "path": [
                "take",
              ],
            },
          ],
          "type": "query",
        },
      ]
    `);
  });

  it("returns a validation error when take is not a number", async () => {
    await request(app)
      .get("/api/notifications?take=abc")
      .set("Cookie", await getAuthCookies())
      .expect(400);
  });

  it("returns a validation error for an unrecognized query param", async () => {
    await request(app)
      .get("/api/notifications?foo=bar")
      .set("Cookie", await getAuthCookies())
      .expect(400);
  });

  it("returns a validation error when read is not 'true' or 'false'", async () => {
    await request(app)
      .get("/api/notifications?read=yes")
      .set("Cookie", await getAuthCookies())
      .expect(400);
  });

  it("filters by read status", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: [
        make("Notification", { userId: user!.id, title: "Read", read: true }),
        make("Notification", {
          userId: user!.id,
          title: "Unread",
          read: false,
        }),
      ],
    });

    const readResponse = await request(app)
      .get("/api/notifications?read=true")
      .set("Cookie", await getAuthCookies())
      .expect(200);
    expect(readResponse.body.notifications.map((n: any) => n.title)).toEqual([
      "Read",
    ]);

    const unreadResponse = await request(app)
      .get("/api/notifications?read=false")
      .set("Cookie", await getAuthCookies())
      .expect(200);
    expect(unreadResponse.body.notifications.map((n: any) => n.title)).toEqual([
      "Unread",
    ]);
  });

  it("filters by dismissed status", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: [
        make("Notification", {
          userId: user!.id,
          title: "Dismissed",
          dismissed: true,
        }),
        make("Notification", {
          userId: user!.id,
          title: "Active",
          dismissed: false,
        }),
      ],
    });

    const dismissedResponse = await request(app)
      .get("/api/notifications?dismissed=true")
      .set("Cookie", await getAuthCookies())
      .expect(200);
    expect(
      dismissedResponse.body.notifications.map((n: any) => n.title),
    ).toEqual(["Dismissed"]);

    const activeResponse = await request(app)
      .get("/api/notifications?dismissed=false")
      .set("Cookie", await getAuthCookies())
      .expect(200);
    expect(activeResponse.body.notifications.map((n: any) => n.title)).toEqual([
      "Active",
    ]);
  });

  it("combines read and dismissed filters", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.notification.createMany({
      data: [
        make("Notification", {
          userId: user!.id,
          title: "Read and dismissed",
          read: true,
          dismissed: true,
        }),
        make("Notification", {
          userId: user!.id,
          title: "Read, not dismissed",
          read: true,
          dismissed: false,
        }),
        make("Notification", {
          userId: user!.id,
          title: "Unread, not dismissed",
          read: false,
          dismissed: false,
        }),
      ],
    });

    const response = await request(app)
      .get("/api/notifications?read=true&dismissed=false")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notifications.map((n: any) => n.title)).toEqual([
      "Read, not dismissed",
    ]);
  });
});

describe("PATCH /:id", () => {
  it("requires a valid session", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", { userId: user!.id }),
    });

    await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: true })
      .expect(401);
  });

  it("returns 404 when the notification does not exist", async () => {
    await request(app)
      .patch("/api/notifications/does-not-exist")
      .send({ read: true })
      .set("Cookie", await getAuthCookies())
      .expect(404);
  });

  it("returns 403 when the notification belongs to another user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", { userId: user!.id }),
    });

    await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: true })
      .set("Cookie", await getAuthCookies("user2@test.com"))
      .expect(403);
  });

  it("does not modify the notification when the owning user check fails", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", { userId: user!.id, read: false }),
    });

    await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: true })
      .set("Cookie", await getAuthCookies("user2@test.com"))
      .expect(403);

    const dbNotification = await db.notification.findUnique({
      where: { id: notification.id },
    });
    expect(dbNotification?.read).toBe(false);
  });

  it("updates the provided fields", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", {
        userId: user!.id,
        title: "Trip reminder",
        read: false,
        dismissed: false,
      }),
    });

    const response = await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: true, dismissed: true })
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      notification: {
        id: notification.id,
        title: "Trip reminder",
        description: notification.description,
        read: true,
        dismissed: true,
        icon: notification.icon,
        referenceUrl: notification.referenceUrl,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  });

  it("persists the update to the database", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", { userId: user!.id, read: false }),
    });

    await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: true })
      .set("Cookie", await getAuthCookies())
      .expect(200);

    const dbNotification = await db.notification.findUnique({
      where: { id: notification.id },
    });
    expect(dbNotification?.read).toBe(true);
  });

  it("allows a partial update, leaving other fields unchanged", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", {
        userId: user!.id,
        read: false,
        dismissed: false,
      }),
    });

    const response = await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: true })
      .set("Cookie", await getAuthCookies())
      .expect(200);

    expect(response.body.notification.read).toBe(true);
    expect(response.body.notification.dismissed).toBe(false);
  });

  it("rejects a non-boolean read value", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", { userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ read: "yes" })
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_type",
              "expected": "boolean",
              "message": "Invalid input: expected boolean, received string",
              "path": [
                "read",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects unrecognized fields", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const notification = await db.notification.create({
      data: make("Notification", { userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/notifications/${notification.id}`)
      .send({ notAField: true })
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "unrecognized_keys",
              "keys": [
                "notAField",
              ],
              "message": "Unrecognized key: "notAField"",
              "path": [],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });
});
