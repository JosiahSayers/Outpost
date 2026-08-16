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
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/party-members")
      .send({ name: "Jane Doe" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("creates a party member with the provided fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe", phone: "555-123-4567" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      partyMember: {
        id: expect.any(String),
        name: "Jane Doe",
        phone: "555-123-4567",
        userId: null,
      },
    });
  });

  it("allows creating a party member without a phone", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe" })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.partyMember.phone).toBeNull();
  });

  it("persists the party member to the database, scoped to the trip", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe" })
      .set("Cookie", authCookies)
      .expect(201);

    const dbPartyMember = await db.tripPartyMember.findUnique({
      where: { id: response.body.partyMember.id },
    });
    expect(dbPartyMember?.tripId).toBe(tripId);
  });

  it("trims the name", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "  Jane Doe  " })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.partyMember.name).toBe("Jane Doe");
  });

  it("rejects a name shorter than 2 characters", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "J" })
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
              "message": "Too small: expected string to have >=2 characters",
              "minimum": 2,
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

  it("rejects a missing name", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ phone: "555-123-4567" })
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

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe", notAField: true })
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

  it("returns 400 when a party member with the same name and phone already exists", async () => {
    await db.tripPartyMember.create({
      data: make("TripPartyMember", {
        tripId,
        name: "Jane Doe",
        phone: "555-123-4567",
      }),
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe", phone: "555-123-4567" })
      .set("Cookie", authCookies)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "error": "A trip member with these details already exists",
      }
    `);
  });

  it("allows the same name with a different phone", async () => {
    await db.tripPartyMember.create({
      data: make("TripPartyMember", {
        tripId,
        name: "Jane Doe",
        phone: "555-123-4567",
      }),
    });

    await request(app)
      .post(`/api/trips/${tripId}/party-members`)
      .send({ name: "Jane Doe", phone: "555-000-0000" })
      .set("Cookie", authCookies)
      .expect(201);
  });
});

describe("DELETE /:memberId", () => {
  let memberId: string;

  beforeEach(async () => {
    const partyMember = await db.tripPartyMember.create({
      data: make("TripPartyMember", { tripId, name: "Jane Doe" }),
    });
    memberId = partyMember.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/party-members/${memberId}`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete(`/api/trips/does-not-exist/party-members/${memberId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/party-members/${memberId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the party member does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/party-members/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the party member belongs to a different trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
    });

    await request(app)
      .delete(`/api/trips/${otherTrip.id}/party-members/${memberId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the party member", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/party-members/${memberId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbPartyMember = await db.tripPartyMember.findUnique({
      where: { id: memberId },
    });
    expect(dbPartyMember).toBeNull();
  });

  it("does not delete the party member when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/party-members/${memberId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbPartyMember = await db.tripPartyMember.findUnique({
      where: { id: memberId },
    });
    expect(dbPartyMember).not.toBeNull();
  });
});

describe("PATCH /:memberId", () => {
  let memberId: string;

  beforeEach(async () => {
    const partyMember = await db.tripPartyMember.create({
      data: make("TripPartyMember", {
        tripId,
        name: "Jane Doe",
        phone: "555-123-4567",
      }),
    });
    memberId = partyMember.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "Jane Smith" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch(`/api/trips/does-not-exist/party-members/${memberId}`)
      .send({ name: "Jane Smith" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "Jane Smith" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the party member does not exist", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/party-members/does-not-exist`)
      .send({ name: "Jane Smith" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the party member belongs to a different trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
    });

    await request(app)
      .patch(`/api/trips/${otherTrip.id}/party-members/${memberId}`)
      .send({ name: "Jane Smith" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("updates the provided fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "Jane Smith", phone: "555-000-0000" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      partyMember: {
        id: memberId,
        name: "Jane Smith",
        phone: "555-000-0000",
        userId: null,
      },
    });
  });

  it("persists the update to the database", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "Jane Smith", phone: "555-000-0000" })
      .set("Cookie", authCookies)
      .expect(200);

    const dbPartyMember = await db.tripPartyMember.findUnique({
      where: { id: memberId },
    });
    expect(dbPartyMember?.name).toBe("Jane Smith");
    expect(dbPartyMember?.phone).toBe("555-000-0000");
  });

  it("trims the name", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "  Jane Smith  ", phone: "555-000-0000" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.partyMember.name).toBe("Jane Smith");
  });

  it("rejects a name shorter than 2 characters", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "J" })
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
              "message": "Too small: expected string to have >=2 characters",
              "minimum": 2,
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
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "Jane Smith", notAField: true })
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

  it("does not modify the party member when the owning user check fails", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/party-members/${memberId}`)
      .send({ name: "Jane Smith" })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbPartyMember = await db.tripPartyMember.findUnique({
      where: { id: memberId },
    });
    expect(dbPartyMember?.name).toBe("Jane Doe");
  });

  describe("when the party member is assigned to an Outpost user", () => {
    let assignedMemberId: string;

    beforeEach(async () => {
      const user2 = await db.user.findUnique({
        where: { email: "user2@test.com" },
      });
      const assignedMember = await db.tripPartyMember.create({
        data: make("TripPartyMember", {
          tripId,
          userId: user2!.id,
          name: null,
          phone: "555-123-4567",
        }),
      });
      assignedMemberId = assignedMember.id;
    });

    it("rejects renaming the party member", async () => {
      const response = await request(app)
        .patch(`/api/trips/${tripId}/party-members/${assignedMemberId}`)
        .send({ name: "New Name" })
        .set("Cookie", authCookies)
        .expect(400);

      expect(response.body).toMatchInlineSnapshot(`
        {
          "error": "This party member is assigned to an Outpost user and their name can't be edited here.",
        }
      `);

      const dbPartyMember = await db.tripPartyMember.findUnique({
        where: { id: assignedMemberId },
      });
      expect(dbPartyMember?.name).toBeNull();
    });

    it("allows updating the phone number", async () => {
      const response = await request(app)
        .patch(`/api/trips/${tripId}/party-members/${assignedMemberId}`)
        .send({ phone: "555-000-0000" })
        .set("Cookie", authCookies)
        .expect(200);

      expect(response.body.partyMember.phone).toBe("555-000-0000");
    });
  });
});
