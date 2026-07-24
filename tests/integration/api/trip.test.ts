import { app } from "$/server";
import { toDateOnly } from "$/transformers/helpers";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .expect(401);
  });

  it("creates a trip with only the required fields", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      trip: {
        id: expect.any(String),
        name: "Appalachian Trail",
        status: "planning",
        trail: null,
        location: null,
        start: null,
        end: null,
      },
    });
  });

  it("defaults status to planning in the database when not provided", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    const dbTrip = await db.trip.findUnique({
      where: { id: response.body.trip.id },
    });
    expect(dbTrip?.status).toBe("planning");
  });

  it("creates a trip with all fields provided", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({
        name: "Appalachian Trail",
        status: "in_progress",
        trail: "AT",
        location: "Georgia to Maine",
        start: "2026-06-01",
        end: "2026-09-01",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      trip: {
        id: expect.any(String),
        name: "Appalachian Trail",
        status: "in_progress",
        trail: "AT",
        location: "Georgia to Maine",
        start: "2026-06-01",
        end: "2026-09-01",
      },
    });
  });

  it("trims the name", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "  Appalachian Trail  " })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.trip.name).toBe("Appalachian Trail");
  });

  it("assigns the trip to the logged in user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });

    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    const dbTrip = await db.trip.findUnique({
      where: { id: response.body.trip.id },
    });
    expect(dbTrip?.userId).toBe(user!.id);
  });

  it("requires a name to be provided", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({})
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_type",
              "expected": "string",
              "message": "Invalid input: expected string, received undefined",
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

  it("rejects an empty name", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "   " })
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
              "message": "Name is required",
              "minimum": 1,
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

  it("rejects an invalid status", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail", status: "bogus" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "in_progress"|"planning"|"postponed"|"finished"|"cancelled"",
              "path": [
                "status",
              ],
              "values": [
                "in_progress",
                "planning",
                "postponed",
                "finished",
                "cancelled",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an unparseable start date", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail", start: "not-a-date" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_format",
              "format": "date",
              "message": "Invalid date",
              "origin": "string",
              "path": [
                "start",
              ],
              "pattern": "/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/",
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an end date before the start date", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({
        name: "Appalachian Trail",
        start: "2026-06-01",
        end: "2026-05-01",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "custom",
              "message": "End date must be on or after the start date",
              "path": [
                "end",
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
      .post("/api/trips")
      .send({ name: "Appalachian Trail", notAField: true })
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

  it("creates the default set of trip tasks", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    const tasks = await db.tripTask.findMany({
      where: { tripId: response.body.trip.id },
    });

    expect(tasks.map((task) => task.name).sort()).toEqual(
      [
        "Share trip plan with emergency contact",
        "Check weather forecast",
        "Pack backpack",
        "Create a meal plan",
        "Assign a packing list",
        "Leave copy of trip plan in vehicle",
        "Post trip report",
        "Unpack",
      ].sort(),
    );
  });

  it("assigns the correct phase to each default task", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    const tasks = await db.tripTask.findMany({
      where: { tripId: response.body.trip.id },
    });
    const phasesByName = Object.fromEntries(
      tasks.map((task) => [task.name, task.phase]),
    );

    expect(phasesByName["Share trip plan with emergency contact"]).toBe(
      "before",
    );
    expect(phasesByName["Check weather forecast"]).toBe("before");
    expect(phasesByName["Pack backpack"]).toBe("before");
    expect(phasesByName["Create a meal plan"]).toBe("before");
    expect(phasesByName["Assign a packing list"]).toBe("before");
    expect(phasesByName["Leave copy of trip plan in vehicle"]).toBe("during");
    expect(phasesByName["Post trip report"]).toBe("after");
    expect(phasesByName["Unpack"]).toBe("after");
  });

  it("sets before-phase task due dates relative to the provided start date", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail", start: "2026-06-10" })
      .set("Cookie", authCookies)
      .expect(201);

    const tasks = await db.tripTask.findMany({
      where: { tripId: response.body.trip.id },
    });
    const dueDatesByName = Object.fromEntries(
      tasks.map((task) => [
        task.name,
        task.dueDate?.toISOString().slice(0, 10),
      ]),
    );

    expect(dueDatesByName["Share trip plan with emergency contact"]).toBe(
      "2026-06-08",
    );
    expect(dueDatesByName["Check weather forecast"]).toBe("2026-06-08");
    expect(dueDatesByName["Pack backpack"]).toBe("2026-06-09");
  });

  it("leaves before-phase task due dates unset when no start date is provided", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    const tasks = await db.tripTask.findMany({
      where: { tripId: response.body.trip.id, phase: "before" },
    });

    expect(tasks.every((task) => task.dueDate === null)).toBe(true);
  });

  it("does not include tasks in the create response body", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.trip.tasks).toBeUndefined();
  });

  it("creates a single meal plan day when no dates are provided", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    const mealPlanDays = await db.mealPlanDay.findMany({
      where: { tripId: response.body.trip.id },
    });

    expect(mealPlanDays).toHaveLength(1);
    expect(mealPlanDays[0]).toMatchObject({ dayNumber: 1, date: null });
  });

  it("creates a meal plan day for each day of the trip when start and end dates are provided", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({
        name: "Appalachian Trail",
        start: "2026-06-01",
        end: "2026-06-04",
      })
      .set("Cookie", authCookies)
      .expect(201);

    const mealPlanDays = await db.mealPlanDay.findMany({
      where: { tripId: response.body.trip.id },
      orderBy: { dayNumber: "asc" },
    });

    expect(mealPlanDays.map((day) => day.dayNumber)).toEqual([1, 2, 3, 4]);
    expect(
      mealPlanDays.map((day) => day.date?.toISOString().slice(0, 10)),
    ).toEqual(["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"]);
  });

  it("creates a single meal plan day when start and end dates are the same", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({
        name: "Appalachian Trail",
        start: "2026-06-01",
        end: "2026-06-01",
      })
      .set("Cookie", authCookies)
      .expect(201);

    const mealPlanDays = await db.mealPlanDay.findMany({
      where: { tripId: response.body.trip.id },
    });

    expect(mealPlanDays).toHaveLength(1);
    expect(mealPlanDays[0]).toMatchObject({
      dayNumber: 1,
      date: new Date("2026-06-01"),
    });
  });

  it("does not include mealPlanDays in the create response body", async () => {
    const response = await request(app)
      .post("/api/trips")
      .send({ name: "Appalachian Trail" })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.trip.mealPlanDays).toBeUndefined();
  });
});

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/api/trips").expect(401);
  });

  it("returns the trips for the logged in user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get("/api/trips?take=100")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    const tripNames = response.body.trips.map((trip: any) => trip.name);
    expect(tripNames).toContain("Appalachian Trail");
  });

  it("does not return user 1's trips for user 2", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get("/api/trips")
      .set("Cookie", user2AuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "pageSize": 3,
        "total": 0,
        "trips": [],
      }
    `);
  });

  it("returns the total count and page size alongside the trips, regardless of take/skip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const before = await db.trip.count({ where: { userId: user!.id } });
    await db.trip.createMany({
      data: Array.from({ length: 5 }, (_, i) =>
        make("Trip", { name: `Trip ${i}`, userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/trips?take=2")
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.trips).toHaveLength(2);
    expect(response.body.total).toBe(before + 5);
    expect(response.body.pageSize).toBe(2);
  });

  it("respects a provided skip parameter", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: [
        make("Trip", {
          name: "First",
          userId: user!.id,
          status: "planning",
          start: new Date("2026-01-01"),
        }),
        make("Trip", {
          name: "Second",
          userId: user!.id,
          status: "planning",
          start: new Date("2026-02-01"),
        }),
        make("Trip", {
          name: "Third",
          userId: user!.id,
          status: "planning",
          start: new Date("2026-03-01"),
        }),
      ],
    });

    const response = await request(app)
      .get("/api/trips?take=100&skip=1")
      .set("Cookie", authCookies)
      .expect(200);

    const tripNames = response.body.trips.map((trip: any) => trip.name);
    expect(tripNames).not.toContain("First");
    expect(tripNames).toContain("Second");
    expect(tripNames).toContain("Third");
  });

  it("defaults to returning at most 3 trips", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: Array.from({ length: 5 }, (_, i) =>
        make("Trip", { name: `Trip ${i}`, userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/trips")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.trips).toHaveLength(3);
  });

  it("sorts by status first, then by start date within each status", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: [
        make("Trip", {
          name: "Finished, later start",
          userId: user!.id,
          status: "finished",
          start: new Date("2026-02-01"),
        }),
        make("Trip", {
          name: "Planning, later start",
          userId: user!.id,
          status: "planning",
          start: new Date("2026-03-01"),
        }),
        make("Trip", {
          name: "Finished, earlier start",
          userId: user!.id,
          status: "finished",
          start: new Date("2026-01-01"),
        }),
        make("Trip", {
          name: "Planning, earlier start",
          userId: user!.id,
          status: "planning",
          start: new Date("2026-01-15"),
        }),
        make("Trip", {
          name: "In progress, later start",
          userId: user!.id,
          status: "in_progress",
          start: new Date("2026-02-15"),
        }),
        make("Trip", {
          name: "In progress, earlier start",
          userId: user!.id,
          status: "in_progress",
          start: new Date("2026-01-10"),
        }),
      ],
    });

    const response = await request(app)
      .get("/api/trips?take=100")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    // Filter out seed data
    const testTripNames = new Set([
      "Finished, later start",
      "Planning, later start",
      "Finished, earlier start",
      "Planning, earlier start",
      "In progress, later start",
      "In progress, earlier start",
    ]);
    const tripNames = response.body.trips
      .map((trip: any) => trip.name)
      .filter((name: string) => testTripNames.has(name));
    expect(tripNames).toEqual([
      "In progress, earlier start",
      "In progress, later start",
      "Planning, earlier start",
      "Planning, later start",
      "Finished, earlier start",
      "Finished, later start",
    ]);
  });

  it("respects a provided take parameter", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: Array.from({ length: 5 }, (_, i) =>
        make("Trip", { name: `Trip ${i}`, userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/trips?take=2")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.trips).toHaveLength(2);
  });
});

describe("GET /:id", () => {
  it("requires a valid session", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app).get(`/api/trips/${trip.id}`).expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .get("/api/trips/does-not-exist")
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns the trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", {
        name: "Appalachian Trail",
        status: "planning",
        userId: user!.id,
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      trip: {
        id: trip.id,
        name: "Appalachian Trail",
        status: "planning",
        trail: trip.trail,
        location: trip.location,
        start: toDateOnly(trip.start),
        end: toDateOnly(trip.end),
        tasks: [],
        mealPlan: [],
        links: [],
      },
    });
  });

  it("returns the trip's tasks", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: {
        ...make("Trip", { name: "Appalachian Trail", userId: user!.id }),
        tasks: {
          createMany: {
            data: [
              { name: "Share trip plan", phase: "before", complete: false },
              { name: "Unpack", phase: "after", complete: true },
            ],
          },
        },
      },
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    const tasks = response.body.trip.tasks.sort((a: any, b: any) =>
      a.name.localeCompare(b.name),
    );
    expect(tasks).toEqual([
      {
        id: expect.any(String),
        name: "Share trip plan",
        phase: "before",
        complete: false,
        dueDate: null,
      },
      {
        id: expect.any(String),
        name: "Unpack",
        phase: "after",
        complete: true,
        dueDate: null,
      },
    ]);
  });

  it("returns an empty tasks array when the trip has no tasks", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.trip.tasks).toEqual([]);
  });

  it("returns the trip's meal plan", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });
    const day = await db.mealPlanDay.create({
      data: make("MealPlanDay", {
        tripId: trip.id,
        dayNumber: 1,
        date: new Date("2026-06-01"),
      }),
    });
    const breakfastItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", {
        mealPlanDayId: day.id,
        meal: "breakfast",
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.trip.mealPlan).toEqual([
      {
        id: day.id,
        dayNumber: 1,
        date: "2026-06-01",
        meals: {
          breakfast: [expect.objectContaining({ id: breakfastItem.id })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      },
    ]);
  });

  it("returns an empty meal plan array when the trip has no meal plan days", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.trip.mealPlan).toEqual([]);
  });

  it("returns the trip's links", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });
    const link = await db.tripLink.create({
      data: make("TripLink", {
        tripId: trip.id,
        url: "https://example.com/trail-guide",
        name: "Trail Guide",
        description: "A helpful guide",
        imageUrl: "https://example.com/image.png",
        type: "article",
        siteName: "Example",
        audioUrl: "https://example.com/audio.mp3",
        videoUrl: "https://example.com/video.mp4",
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.trip.links).toEqual([
      {
        id: link.id,
        url: "https://example.com/trail-guide",
        name: "Trail Guide",
        description: "A helpful guide",
        imageUrl: "https://example.com/image.png",
        type: "article",
        siteName: "Example",
        audioUrl: "https://example.com/audio.mp3",
        videoUrl: "https://example.com/video.mp4",
      },
    ]);
  });

  it("returns an empty links array when the trip has no links", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.trip.links).toEqual([]);
  });
});

describe("PATCH /:id", () => {
  it("requires a valid session", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ name: "Pacific Crest Trail" })
      .expect(401);
  });

  it("updates the provided fields", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({
        name: "Pacific Crest Trail",
        status: "in_progress",
        trail: "PCT",
        location: "Mexico to Canada",
        start: "2026-06-01",
        end: "2026-09-01",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      trip: {
        id: trip.id,
        name: "Pacific Crest Trail",
        status: "in_progress",
        trail: "PCT",
        location: "Mexico to Canada",
        start: "2026-06-01",
        end: "2026-09-01",
      },
    });
  });

  it("persists the update to the database", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ name: "Pacific Crest Trail" })
      .set("Cookie", authCookies)
      .expect(200);

    const dbTrip = await db.trip.findUnique({ where: { id: trip.id } });
    expect(dbTrip?.name).toBe("Pacific Crest Trail");
  });

  it("allows a partial update, leaving other fields unchanged", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", {
        name: "Appalachian Trail",
        status: "planning",
        trail: "AT",
        userId: user!.id,
      }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ status: "in_progress" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body).toEqual({
      trip: {
        id: trip.id,
        name: "Appalachian Trail",
        status: "in_progress",
        trail: "AT",
        location: trip.location,
        start: toDateOnly(trip.start),
        end: toDateOnly(trip.end),
      },
    });
  });

  it("clears the start and end dates when sent as null", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", {
        name: "Appalachian Trail",
        userId: user!.id,
        start: new Date("2026-06-01"),
        end: new Date("2026-09-01"),
      }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ start: null, end: null })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body).toEqual({
      trip: {
        id: trip.id,
        name: "Appalachian Trail",
        status: "planning",
        trail: trip.trail,
        location: trip.location,
        start: null,
        end: null,
      },
    });

    const dbTrip = await db.trip.findUnique({ where: { id: trip.id } });
    expect(dbTrip?.start).toBeNull();
    expect(dbTrip?.end).toBeNull();
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch("/api/trips/does-not-exist")
      .send({ name: "Pacific Crest Trail" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ name: "Pacific Crest Trail" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("does not modify the trip when the owning user check fails", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ name: "Pacific Crest Trail" })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbTrip = await db.trip.findUnique({ where: { id: trip.id } });
    expect(dbTrip?.name).toBe("Appalachian Trail");
  });

  it("rejects an invalid status", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ status: "bogus" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "in_progress"|"planning"|"postponed"|"finished"|"cancelled"",
              "path": [
                "status",
              ],
              "values": [
                "in_progress",
                "planning",
                "postponed",
                "finished",
                "cancelled",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an end date before the start date", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({
        start: "2026-06-01",
        end: "2026-05-01",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "custom",
              "message": "End date must be on or after the start date",
              "path": [
                "end",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an empty name", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .send({ name: "   " })
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
              "message": "Name is required",
              "minimum": 1,
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
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .patch(`/api/trips/${trip.id}`)
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
});

describe("DELETE /:id", () => {
  it("requires a valid session", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app).delete(`/api/trips/${trip.id}`).expect(401);
  });

  it("deletes the trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbTrip = await db.trip.findUnique({ where: { id: trip.id } });
    expect(dbTrip).toBeNull();
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete("/api/trips/does-not-exist")
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("does not delete the trip when the owning user check fails", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const trip = await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbTrip = await db.trip.findUnique({ where: { id: trip.id } });
    expect(dbTrip).not.toBeNull();
  });
});
