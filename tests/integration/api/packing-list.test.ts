import { beforeAll, describe, expect, it } from "bun:test";
import { getAuthCookies } from "../../helpers/auth";
import supertest from "supertest";
import { app } from "$/server";
import { db } from "$/utils/db";
import { transformers } from "$/transformers";
import type { User } from "better-auth";
import type { PackingList } from "../../../generated/prisma/client";

let authCookies: Array<string>;

beforeAll(async () => {
  authCookies = await getAuthCookies();
});

describe("GET /", () => {
  it("returns a minimal version of a packing list", async () => {
    const response = await supertest(app)
      .get("/api/packing-lists?query=rei")
      .set("Cookie", authCookies)
      .expect("Content-Type", /application\/json/)
      .expect(200);
    expect(response.body).toMatchInlineSnapshot(`
      {
        "packingLists": [
          {
            "copiedFromPackingListId": null,
            "description": "To determine what you need to bring on a backpacking trip, think about how far you plan to hike, how remote the location is and what the weather forecast has in store. This list is intentionally comprehensive and you won’t take all items.",
            "editable": false,
            "id": 1,
            "name": "REI Backpacking Checklist",
            "public": true,
            "sourceUrl": "https://www.rei.com/dam/backpacking_checklist_printable.pdf",
          },
        ],
      }
    `);
  });

  it("returns a validation error when a query is not sent", async () => {
    const response = await supertest(app)
      .get("/api/packing-lists?query=")
      .set("Cookie", authCookies)
      .expect("Content-Type", /application\/json/)
      .expect(400);
    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=1 characters",
              "minimum": 1,
              "origin": "string",
              "path": [
                "query",
              ],
            },
          ],
          "type": "query",
        },
      ]
    `);
  });

  it("requires a valid session", async () => {
    const response = await supertest(app)
      .get("/api/packing-lists?query=")
      .expect(401);
  });
});

describe("GET /:id", () => {
  it("returns a full packing list representation", async () => {
    const existingPackingList = await db.packingList.findFirst({
      where: { name: "REI Backpacking Checklist" },
    });
    const response = await supertest(app)
      .get(`/api/packing-lists/${existingPackingList!.id}`)
      .set("Cookie", authCookies)
      .expect("Content-Type", /application\/json/)
      .expect(200);
    expect(response.body).toMatchInlineSnapshot(`
      {
        "packingList": {
          "copiedFromPackingListId": null,
          "description": "To determine what you need to bring on a backpacking trip, think about how far you plan to hike, how remote the location is and what the weather forecast has in store. This list is intentionally comprehensive and you won’t take all items.",
          "editable": false,
          "id": 1,
          "name": "REI Backpacking Checklist",
          "public": true,
          "sections": [
            {
              "id": 1,
              "items": [
                {
                  "id": 1,
                  "name": "Backpack",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 2,
                  "name": "Backpacking tent",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 3,
                  "name": "Sleeping bag",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 4,
                  "name": "Sleeping pad",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 5,
                  "name": "Headlamp or flashlight (with extra batteries)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 6,
                  "name": "Trekking poles",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 6,
                },
                {
                  "id": 7,
                  "name": "Packable lantern",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 7,
                },
                {
                  "id": 8,
                  "name": "Tent footprint",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 8,
                },
                {
                  "id": 9,
                  "name": "Pillow",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 9,
                },
                {
                  "id": 10,
                  "name": "Bear spray",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 10,
                },
              ],
              "name": "Backpacking Gear",
              "sortPosition": 1,
            },
            {
              "id": 2,
              "items": [
                {
                  "id": 11,
                  "name": "Map (in waterproof sleeve)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 12,
                  "name": "Compass",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 13,
                  "name": "Route description/guidebook",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 14,
                  "name": "Altimeter Watch",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 15,
                  "name": "GPS",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 16,
                  "name": "Satellite messenger and/or personal locator beacon",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 6,
                },
              ],
              "name": "Navigation",
              "sortPosition": 2,
            },
            {
              "id": 3,
              "items": [
                {
                  "id": 17,
                  "name": "Moisture-wicking underwear",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 18,
                  "name": "Moisture-wicking T-shirts",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 19,
                  "name": "Quick-drying pants/shorts",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 20,
                  "name": "Long-sleeve shirts (for sun and bugs)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 21,
                  "name": "Lightweight fleece or jacket",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 22,
                  "name": "Boots or shoes suited to terrain",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 6,
                },
                {
                  "id": 23,
                  "name": "Socks (synthetic or wool)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 7,
                },
                {
                  "id": 24,
                  "name": "Extra clothes (beyond the minimum expectation)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 8,
                },
                {
                  "id": 25,
                  "name": "Rainwear (jacket and pants)",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 9,
                },
                {
                  "id": 26,
                  "name": "Long underwear",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 10,
                },
                {
                  "id": 27,
                  "name": "Warm insulated jacket or vest",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 11,
                },
                {
                  "id": 28,
                  "name": "Fleece pants",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 12,
                },
                {
                  "id": 29,
                  "name": "Gloves or mittens",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 13,
                },
                {
                  "id": 30,
                  "name": "Warm hat",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 14,
                },
                {
                  "id": 31,
                  "name": "Sandals (for fording streams and/or camp shoes)",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 15,
                },
                {
                  "id": 32,
                  "name": "Bandana or Buff",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 16,
                },
                {
                  "id": 33,
                  "name": "Gaiters (for rainy, snowy, or muddy conditions)",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 17,
                },
              ],
              "name": "Clothing/Footwear",
              "sortPosition": 3,
            },
            {
              "id": 4,
              "items": [
                {
                  "id": 34,
                  "name": "Backpacking stove",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 35,
                  "name": "Fuel",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 36,
                  "name": "Cookset",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 37,
                  "name": "Dishes/bowls",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 38,
                  "name": "Eating utensils",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 39,
                  "name": "Mug/cup",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 6,
                },
                {
                  "id": 40,
                  "name": "Biodegradable soap",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 7,
                },
                {
                  "id": 41,
                  "name": "Small quick-dry towel",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 8,
                },
                {
                  "id": 42,
                  "name": "Collapsible water container",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 9,
                },
                {
                  "id": 43,
                  "name": "Bear canister/food sack; or hang bag + 50’ nylon cord",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 10,
                },
              ],
              "name": "Camp Kitchen",
              "sortPosition": 4,
            },
            {
              "id": 5,
              "items": [
                {
                  "id": 44,
                  "name": "Water bottles and/or reservoir ",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 45,
                  "name": "Water filter/purifier or chemical treatment",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 46,
                  "name": "Meals",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 47,
                  "name": "Energy food and drinks (bars, gels, chews, trail mix, drink mix)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 48,
                  "name": "Extra day’s supply of food",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
              ],
              "name": "Food & Water",
              "sortPosition": 5,
            },
            {
              "id": 6,
              "items": [
                {
                  "id": 49,
                  "name": "Hand sanitizer",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 50,
                  "name": "Toothbrush and toothpaste",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 51,
                  "name": "Sanitation trowel",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 52,
                  "name": "Toilet paper/wipes and sealable bag (to pack it out)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 53,
                  "name": "Menstrual products",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 54,
                  "name": "Prescription medications",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 6,
                },
                {
                  "id": 55,
                  "name": "Prescription glasses",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 7,
                },
                {
                  "id": 56,
                  "name": "Sunglasses (+ retainer leash)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 8,
                },
                {
                  "id": 57,
                  "name": "Sunscreen",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 9,
                },
                {
                  "id": 58,
                  "name": "SPF-rated lip balm ",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 10,
                },
                {
                  "id": 59,
                  "name": "Sun hat",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 11,
                },
                {
                  "id": 60,
                  "name": "Insect repellent",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 12,
                },
                {
                  "id": 61,
                  "name": "Urinary products",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 13,
                },
                {
                  "id": 62,
                  "name": "Additional blister treatment supplies",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 14,
                },
              ],
              "name": "Health & Hygiene",
              "sortPosition": 6,
            },
            {
              "id": 7,
              "items": [
                {
                  "id": 63,
                  "name": "Knife or multi-tool",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 64,
                  "name": "Repair kit for mattress, stove",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 65,
                  "name": "Duct tape strips",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
              ],
              "name": "Tools & Repairs",
              "sortPosition": 7,
            },
            {
              "id": 8,
              "items": [
                {
                  "id": 66,
                  "name": "First-aid kit or supplies ",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 67,
                  "name": "Whistle",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 68,
                  "name": "Lighter/matches (in waterproof container)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 69,
                  "name": "Fire starter (for emergency survival fire)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 70,
                  "name": "Emergency shelter",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 71,
                  "name": "Two itineraries: 1 left with friend + 1 under car seat",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 6,
                },
              ],
              "name": "Emergency Items",
              "sortPosition": 8,
            },
            {
              "id": 9,
              "items": [
                {
                  "id": 81,
                  "name": "Permits (if needed)",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 82,
                  "name": "Credit card and/or cash",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 83,
                  "name": "ID",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 84,
                  "name": "Car keys",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 85,
                  "name": "Cellphone",
                  "optional": false,
                  "quantity": 1,
                  "sortPosition": 5,
                },
              ],
              "name": "Personal Items",
              "sortPosition": 9,
            },
            {
              "id": 10,
              "items": [
                {
                  "id": 72,
                  "name": "Daypack (for day trips away from camp)",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 1,
                },
                {
                  "id": 73,
                  "name": "Camera or action cam (with extra memory cards)",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 2,
                },
                {
                  "id": 74,
                  "name": "Interpretive field guide(s)",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 3,
                },
                {
                  "id": 75,
                  "name": "Star chart/night-sky identifier",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 4,
                },
                {
                  "id": 76,
                  "name": "Outdoor journal or sketchbook with pen/pencil",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 5,
                },
                {
                  "id": 77,
                  "name": "Book/reading material",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 6,
                },
                {
                  "id": 78,
                  "name": "Cards or games",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 7,
                },
                {
                  "id": 79,
                  "name": "Compact binoculars",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 8,
                },
                {
                  "id": 80,
                  "name": "Two-way radios",
                  "optional": true,
                  "quantity": 1,
                  "sortPosition": 9,
                },
              ],
              "name": "Backpacking Extras",
              "sortPosition": 10,
            },
          ],
          "sourceUrl": "https://www.rei.com/dam/backpacking_checklist_printable.pdf",
        },
      }
    `);
  });

  it("returns editable: false when the user does not own the list", async () => {
    const reiList = (await db.packingList.findFirst({
      where: { name: "REI Backpacking Checklist" },
    }))!;
    expect(reiList.userId).toBeNull();

    const response = await supertest(app)
      .get(`/api/packing-lists/${reiList.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.packingList.editable).toBe(false);
  });

  it("returns editable: true when the user owns the list", async () => {
    const user = (await db.user.findUnique({
      where: { email: "user@test.com" },
    }))!;
    const ownedList = await db.packingList.create({
      data: { name: "My Editable List", userId: user.id },
    });

    const response = await supertest(app)
      .get(`/api/packing-lists/${ownedList.id}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.packingList.editable).toBe(true);
  });

  it("returns a 404 status when the packing list is not found", async () => {
    const response = await supertest(app)
      .get(`/api/packing-lists/-1`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("requires a valid session", async () => {
    const existingPackingList = await db.packingList.findFirst({
      where: { name: "REI Backpacking Checklist" },
    });
    const response = await supertest(app)
      .get(`/api/packing-lists/${existingPackingList!.id}`)
      .expect(401);
  });
});

describe("POST /", () => {
  it("requires a name to be provided", async () => {
    const response = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({
        name: undefined,
      })
      .expect("Content-Type", /application\/json/)
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

  it("requires name to be at least 3 characters long after trimming", async () => {
    const response = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({
        name: "12    ",
      })
      .expect("Content-Type", /application\/json/)
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

  it("requires a valid session", async () => {
    await supertest(app)
      .post("/api/packing-lists")
      .send({ name: "New Packing List" })
      .expect(401);
  });

  it("returns a 404 when copiedFromPackingListId is sent but does not exist", async () => {
    const { body } = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({ name: "New Packing List", copiedFromPackingListId: -1 })
      .expect("Content-Type", /application\/json/)
      .expect(404);

    expect(body).toMatchInlineSnapshot(`
      {
        "error": "Could not find an existing packing list with the id: -1",
      }
    `);
  });

  it("returns a 404 when the copiedFromPackingListId is not public and is not owned by the user", async () => {
    const user1 = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const user1List = await db.packingList.create({
      data: { name: "Can't Touch This", userId: user1!.id },
    });
    const user2AuthCookies = await getAuthCookies("user2@test.com");

    const { body } = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", user2AuthCookies)
      .send({
        name: "My Original List That I Totally Created Myself",
        copiedFromPackingListId: user1List.id,
      })
      .expect("Content-Type", /application\/json/)
      .expect(404);

    expect(body).toMatchInlineSnapshot(`
      {
        "error": "Could not find an existing packing list with the id: 2",
      }
    `);
  });

  it("creates a new packing list when no copiedFromPackingListId is sent", async () => {
    const { body } = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({ name: "New Packing List" })
      .expect("Content-Type", /application\/json/)
      .expect(201);

    expect(body).toEqual({
      packingList: {
        copiedFromPackingListId: null,
        description: null,
        editable: true,
        id: expect.any(Number),
        name: "New Packing List",
        public: false,
        sections: [],
        sourceUrl: null,
      },
    });
  });

  it("creates a new packing list with all of the sections and items from the sent copiedFromPackingListId", async () => {
    const existingList = await db.packingList.findFirst({
      where: { name: "REI Backpacking Checklist" },
      include: {
        packingListSections: {
          include: {
            items: true,
          },
        },
      },
    });
    const transformedExistingList = transformers.packingList(existingList!);

    const { body } = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({
        name: "New Packing List",
        copiedFromPackingListId: transformedExistingList.id,
      })
      .expect("Content-Type", /application\/json/)
      .expect(201);

    expect(body.packingList.copiedFromPackingListId).toBe(
      transformedExistingList.id,
    );
    const newWithoutIds = body.packingList.sections.map((section: any) => ({
      ...section,
      id: undefined,
      items: section.items.map((item: any) => ({
        ...item,
        id: undefined,
      })),
    }));
    const originalWithoutIds = transformedExistingList.sections.map(
      (section: any) => ({
        ...section,
        id: undefined,
        items: section.items.map((item: any) => ({
          ...item,
          id: undefined,
        })),
      }),
    );
    expect(newWithoutIds).toEqual(originalWithoutIds);
  });
});

describe("DELETE /:id", () => {
  let user2AuthCookies: string[];
  let user1: User;
  let user2: User;
  let reiPackingList: PackingList;

  beforeAll(async () => {
    user1 = (await db.user.findUnique({ where: { email: "user@test.com" } }))!;
    user2 = (await db.user.findUnique({ where: { email: "user2@test.com" } }))!;
    user2AuthCookies = await getAuthCookies(user2.email);
    reiPackingList = (await db.packingList.findFirst({
      where: { name: "REI Backpacking Checklist" },
    }))!;
  });

  it("requires a valid session", (done) => {
    supertest(app).delete("/api/packing-lists/1").expect(401, done);
  });

  it("returns a 404 when the packing list cannot be found", (done) => {
    supertest(app)
      .delete("/api/packing-lists/-1")
      .set("Cookie", authCookies)
      .expect(404, done);
  });

  it("returns a 403 when the user does not own the packing list", async () => {
    const user1List = await db.packingList.create({
      data: { name: "Can't Touch This", userId: user1!.id },
    });

    await supertest(app)
      .delete(`/api/packing-lists/${user1List.id}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns a 403 when the packing list does not have an associated user", async () => {
    expect(reiPackingList!.userId).toBeNull();
    await supertest(app)
      .delete(`/api/packing-lists/${reiPackingList!.id}`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 200 when the packing list is deleted", async () => {
    const user1List = await db.packingList.create({
      data: { name: "New List", userId: user1!.id },
    });

    await supertest(app)
      .delete(`/api/packing-lists/${user1List.id}`)
      .set("Cookie", authCookies)
      .expect(200);
  });

  it("deletes the list, all list sections, and all list items when successful", async () => {
    const newListResponse = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({ name: "My New List", copiedFromPackingListId: reiPackingList.id })
      .expect(201);

    const packingListId = newListResponse.body.packingList.id;
    const sectionIds = newListResponse.body.packingList.sections.map(
      (section: any) => section.id,
    );
    const itemIds = newListResponse.body.packingList.sections.reduce(
      (currentIdList: number[], section: any) => {
        const sectionItemIds = section.items.map((item: any) => item.id);
        return [...currentIdList, ...sectionItemIds];
      },
      [],
    );
    const preDeleteCounts = {
      list: await db.packingList.count({ where: { id: packingListId } }),
      sections: await db.packingListSection.count({
        where: { id: { in: sectionIds } },
      }),
      items: await db.packingListItem.count({
        where: { id: { in: itemIds } },
      }),
    };

    expect(preDeleteCounts.list).toBe(1);
    expect(preDeleteCounts.sections).toBe(sectionIds.length);
    expect(preDeleteCounts.items).toBe(itemIds.length);

    await supertest(app)
      .delete(`/api/packing-lists/${packingListId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const postDeleteCounts = {
      list: await db.packingList.count({ where: { id: packingListId } }),
      sections: await db.packingListSection.count({
        where: { id: { in: sectionIds } },
      }),
      items: await db.packingListItem.count({
        where: { id: { in: itemIds } },
      }),
    };

    expect(postDeleteCounts.list).toBe(0);
    expect(postDeleteCounts.sections).toBe(0);
    expect(postDeleteCounts.items).toBe(0);
  });
});

describe("PATCH /:id", () => {
  let user1: User;
  let user2: User;
  let user2AuthCookies: string[];

  beforeAll(async () => {
    user1 = (await db.user.findUnique({ where: { email: "user@test.com" } }))!;
    user2 = (await db.user.findUnique({ where: { email: "user2@test.com" } }))!;
    user2AuthCookies = await getAuthCookies(user2.email);
  });

  it("requires a valid session", (done) => {
    supertest(app).patch("/api/packing-lists/1").expect(401, done);
  });

  it("returns a 403 when the user cannot edit the packing list", async () => {
    const user1List = await db.packingList.create({
      data: { name: "User 1 List", userId: user1.id },
    });

    await supertest(app)
      .patch(`/api/packing-lists/${user1List.id}`)
      .set("Cookie", user2AuthCookies)
      .send({ name: "Hijacked" })
      .expect(403);
  });

  it("returns a 400 when name is not provided", async () => {
    const list = await db.packingList.create({
      data: { name: "Editable List", userId: user1.id },
    });

    await supertest(app)
      .patch(`/api/packing-lists/${list.id}`)
      .set("Cookie", authCookies)
      .send({ description: "No name here" })
      .expect(400);
  });

  it("updates the name", async () => {
    const list = await db.packingList.create({
      data: { name: "Old Name", userId: user1.id },
    });

    const response = await supertest(app)
      .patch(`/api/packing-lists/${list.id}`)
      .set("Cookie", authCookies)
      .send({ name: "New Name" })
      .expect(200);

    expect(response.body.packingList.name).toBe("New Name");
  });

  it("updates the description alongside the name", async () => {
    const list = await db.packingList.create({
      data: { name: "Has Description", userId: user1.id },
    });

    const response = await supertest(app)
      .patch(`/api/packing-lists/${list.id}`)
      .set("Cookie", authCookies)
      .send({
        name: "Has Description",
        description: "Packed for a weekend trip",
      })
      .expect(200);

    expect(response.body.packingList.description).toBe(
      "Packed for a weekend trip",
    );
  });

  it("leaves the description untouched when only the name is sent", async () => {
    const list = await db.packingList.create({
      data: {
        name: "Keep My Description",
        description: "Original description",
        userId: user1.id,
      },
    });

    const response = await supertest(app)
      .patch(`/api/packing-lists/${list.id}`)
      .set("Cookie", authCookies)
      .send({ name: "Renamed" })
      .expect(200);

    expect(response.body.packingList.name).toBe("Renamed");
    expect(response.body.packingList.description).toBe("Original description");
  });
});

describe("GET /:id/pdf", () => {
  let reiPackingList: PackingList;

  beforeAll(async () => {
    reiPackingList = (await db.packingList.findFirst({
      where: { name: "REI Backpacking Checklist" },
    }))!;
  });

  it("transfers a pdf document to the user for public packing lists", async () => {
    await supertest(app)
      .get(`/api/packing-lists/${reiPackingList!.id}/pdf`)
      .set("Cookie", authCookies)
      .expect("Content-Type", "application/pdf")
      .expect("content-disposition", 'attachment; filename="packing-list.pdf"')
      .expect(200);
  });

  it("transfers a pdf document to the user for private packing lists", async () => {
    const newListResponse = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({ name: "My New List", copiedFromPackingListId: reiPackingList.id })
      .expect(201);

    const newListId = newListResponse.body.packingList.id;

    await supertest(app)
      .get(`/api/packing-lists/${newListId}/pdf`)
      .set("Cookie", authCookies)
      .expect("Content-Type", "application/pdf")
      .expect("content-disposition", 'attachment; filename="packing-list.pdf"')
      .expect(200);
  });

  it("returns a 403 when a user tries to download a packing-list they don't own and is not public", async () => {
    const newListResponse = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({ name: "My New List", copiedFromPackingListId: reiPackingList.id })
      .expect(201);

    const newListId = newListResponse.body.packingList.id;
    const user2AuthCookies = await getAuthCookies("user2@test.com");

    await supertest(app)
      .get(`/api/packing-lists/${newListId}/pdf`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("requires a valid session", async () => {
    await supertest(app)
      .get(`/api/packing-lists/${reiPackingList.id}/pdf`)
      .expect(401);
  });

  it("returns a 404 when the packing-list id cannot be found", async () => {
    await supertest(app)
      .get(`/api/packing-lists/-1/pdf`)
      .set("Cookie", authCookies)
      .expect(404);
  });
});
