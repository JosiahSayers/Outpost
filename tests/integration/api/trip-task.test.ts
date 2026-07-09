import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;
let tripId: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");

  const user = await db.user.findUnique({
    where: { email: "user@test.com" },
  });
  const trip = await db.trip.create({
    data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
  });
  tripId = trip.id;
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "before" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/tasks")
      .send({ name: "Pack backpack", phase: "before" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "before" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("creates a task with the provided fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({
        name: "Pack backpack",
        phase: "before",
        complete: true,
        dueDate: "2026-06-01",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      task: {
        id: expect.any(String),
        name: "Pack backpack",
        phase: "before",
        complete: true,
        dueDate: "2026-06-01",
      },
    });
  });

  it("defaults complete to false when not provided", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "before" })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.task.complete).toBe(false);
  });

  it("persists the task to the database, scoped to the trip", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "before" })
      .set("Cookie", authCookies)
      .expect(201);

    const dbTask = await db.tripTask.findUnique({
      where: { id: response.body.task.id },
    });
    expect(dbTask?.tripId).toBe(tripId);
  });

  it("trims the name", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "  Pack backpack  ", phase: "before" })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.task.name).toBe("Pack backpack");
  });

  it("rejects a name shorter than 3 characters", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "ab", phase: "before" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=3 characters",
              "minimum": 3,
              "origin": "string",
              "path": [
                "name",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects a missing phase", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "before"|"during"|"after"",
              "path": [
                "phase",
              ],
              "values": [
                "before",
                "during",
                "after",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an invalid phase", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "bogus" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "before"|"during"|"after"",
              "path": [
                "phase",
              ],
              "values": [
                "before",
                "during",
                "after",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "before", notAField: true })
      .set("Cookie", authCookies)
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

  it("returns 400 when a task with the same name already exists in that phase", async () => {
    await db.tripTask.create({
      data: make("TripTask", {
        tripId,
        name: "Pack backpack",
        phase: "before",
      }),
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "before" })
      .set("Cookie", authCookies)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "error": ""Pack backpack" is already a task in this trip phase",
      }
    `);
  });

  it("allows the same task name in a different phase", async () => {
    await db.tripTask.create({
      data: make("TripTask", {
        tripId,
        name: "Pack backpack",
        phase: "before",
      }),
    });

    await request(app)
      .post(`/api/trips/${tripId}/tasks`)
      .send({ name: "Pack backpack", phase: "during" })
      .set("Cookie", authCookies)
      .expect(201);
  });
});

describe("DELETE /:taskId", () => {
  let taskId: string;

  beforeEach(async () => {
    const task = await db.tripTask.create({
      data: make("TripTask", {
        tripId,
        name: "Pack backpack",
        phase: "before",
      }),
    });
    taskId = task.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/tasks/${taskId}`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete(`/api/trips/does-not-exist/tasks/${taskId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/tasks/${taskId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the task does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/tasks/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the task belongs to a different trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
    });

    await request(app)
      .delete(`/api/trips/${otherTrip.id}/tasks/${taskId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the task", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/tasks/${taskId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbTask = await db.tripTask.findUnique({ where: { id: taskId } });
    expect(dbTask).toBeNull();
  });

  it("does not delete the task when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/tasks/${taskId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbTask = await db.tripTask.findUnique({ where: { id: taskId } });
    expect(dbTask).not.toBeNull();
  });
});

describe("PATCH /:taskId", () => {
  let taskId: string;

  beforeEach(async () => {
    const task = await db.tripTask.create({
      data: make("TripTask", {
        tripId,
        name: "Pack backpack",
        phase: "before",
        complete: false,
        dueDate: new Date("2026-05-01"),
      }),
    });
    taskId = task.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ complete: true })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch(`/api/trips/does-not-exist/tasks/${taskId}`)
      .send({ complete: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ complete: true })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the task does not exist", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/tasks/does-not-exist`)
      .send({ complete: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the task belongs to a different trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
    });

    await request(app)
      .patch(`/api/trips/${otherTrip.id}/tasks/${taskId}`)
      .send({ complete: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("updates the provided fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({
        name: "Pack bear canister",
        phase: "during",
        complete: true,
        dueDate: "2026-06-05",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      task: {
        id: taskId,
        name: "Pack bear canister",
        phase: "during",
        complete: true,
        dueDate: "2026-06-05",
      },
    });
  });

  it("persists the update to the database", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ complete: true })
      .set("Cookie", authCookies)
      .expect(200);

    const dbTask = await db.tripTask.findUnique({ where: { id: taskId } });
    expect(dbTask?.complete).toBe(true);
  });

  it("allows a partial update, leaving other fields unchanged", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ complete: true })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body).toEqual({
      task: {
        id: taskId,
        name: "Pack backpack",
        phase: "before",
        complete: true,
        dueDate: "2026-05-01",
      },
    });
  });

  it("rejects an invalid phase", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ phase: "bogus" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "before"|"during"|"after"",
              "path": [
                "phase",
              ],
              "values": [
                "before",
                "during",
                "after",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects a name shorter than 3 characters", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ name: "ab" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=3 characters",
              "minimum": 3,
              "origin": "string",
              "path": [
                "name",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ notAField: true })
      .set("Cookie", authCookies)
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

  it("does not modify the task when the owning user check fails", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/tasks/${taskId}`)
      .send({ complete: true })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbTask = await db.tripTask.findUnique({ where: { id: taskId } });
    expect(dbTask?.complete).toBe(false);
  });
});
