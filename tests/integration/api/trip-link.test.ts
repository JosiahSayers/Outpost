import { app } from "$/server";
import { db } from "$/utils/db";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

const OG_HTML = `
  <html>
    <head>
      <meta property="og:title" content="Appalachian Trail Guide" />
      <meta property="og:description" content="Everything you need to know" />
      <meta property="og:image" content="https://example.com/image.png" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Example" />
      <meta property="og:audio" content="https://example.com/audio.mp3" />
      <meta property="og:video" content="https://example.com/video.mp4" />
    </head>
  </html>
`;

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;
let tripId: string;
let fetchSpy: ReturnType<typeof spyOn>;

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

  // The router shells out to a real Open Graph fetch; stub the global `fetch`
  // so tests never hit the network. supertest uses Node's http client, so this
  // only affects `fetchOpenGraph`.
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    (async () =>
      new Response(OG_HTML, {
        headers: { "content-type": "text/html" },
      })) as any,
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/links")
      .send({ url: "https://example.com/guide" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("creates a link and returns it with the fetched Open Graph metadata", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      link: {
        id: expect.any(String),
        url: "https://example.com/guide",
        name: "Appalachian Trail Guide",
        description: "Everything you need to know",
        imageUrl: "https://example.com/image.png",
        type: "article",
        siteName: "Example",
        audioUrl: "https://example.com/audio.mp3",
        videoUrl: "https://example.com/video.mp4",
      },
    });
  });

  it("fetches Open Graph data for the submitted url", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toBe("https://example.com/guide");
  });

  it("persists the link to the database, scoped to the trip", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .set("Cookie", authCookies)
      .expect(200);

    const dbLink = await db.tripLink.findUnique({
      where: { id: response.body.link.id },
    });
    expect(dbLink?.tripId).toBe(tripId);
    expect(dbLink?.url).toBe("https://example.com/guide");
  });

  it("leaves Open Graph fields null when the page has no tags", async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response("<html><head></head><body>Hi</body></html>", {
          headers: { "content-type": "text/html" },
        }),
    );

    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/plain" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.link).toMatchObject({
      url: "https://example.com/plain",
      name: null,
      description: null,
      imageUrl: null,
      type: null,
      siteName: null,
      audioUrl: null,
      videoUrl: null,
    });
  });

  it("still creates the link when the Open Graph fetch fails", async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error("network error");
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/unreachable" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    // Capture the id before asserting: toMatchObject with expect.any(String)
    // mutates the matched field on the received object.
    const linkId = response.body.link.id;
    expect(linkId).toEqual(expect.any(String));
    expect(response.body.link).toMatchObject({
      url: "https://example.com/unreachable",
      name: null,
      description: null,
      imageUrl: null,
      type: null,
      siteName: null,
      audioUrl: null,
      videoUrl: null,
    });

    const dbLink = await db.tripLink.findUnique({
      where: { id: linkId },
    });
    expect(dbLink?.tripId).toBe(tripId);
    expect(dbLink?.url).toBe("https://example.com/unreachable");
  });

  it.each([
    "http://localhost/admin",
    "http://127.0.0.1/admin",
    "http://169.254.169.254/latest/meta-data",
  ])(
    "rejects the internal url %p at validation, before any fetch",
    async (url) => {
      // z.httpUrl() blocks localhost and raw-IP hosts outright, so requests
      // aimed at internal literals never reach the Open Graph fetcher. Hosts
      // that *resolve* to internal addresses are caught later by the SSRF guard
      // in fetchOpenGraph (covered in the open-graph unit tests).
      await request(app)
        .post(`/api/trips/${tripId}/links`)
        .send({ url })
        .set("Cookie", authCookies)
        .expect(400);

      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing url", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
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
                "url",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects a non-http url", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "not-a-url" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_format",
              "format": "url",
              "message": "Invalid URL",
              "note": "Invalid URL format",
              "path": [
                "url",
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
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide", notAField: true })
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

  it("returns 409 when the url already exists on the trip", async () => {
    await db.tripLink.create({
      data: make("TripLink", {
        tripId,
        url: "https://example.com/guide",
      }),
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "error": "That URL already exists on this trip",
      }
    `);
  });

  it("allows the same url on a different trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
    });
    await db.tripLink.create({
      data: make("TripLink", {
        tripId: otherTrip.id,
        url: "https://example.com/guide",
      }),
    });

    await request(app)
      .post(`/api/trips/${tripId}/links`)
      .send({ url: "https://example.com/guide" })
      .set("Cookie", authCookies)
      .expect(200);
  });
});

describe("DELETE /:linkId", () => {
  let linkId: string;

  beforeEach(async () => {
    const link = await db.tripLink.create({
      data: make("TripLink", {
        tripId,
        url: "https://example.com/guide",
      }),
    });
    linkId = link.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/links/${linkId}`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete(`/api/trips/does-not-exist/links/${linkId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/links/${linkId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the link does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/links/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the link belongs to a different trip", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
    });

    await request(app)
      .delete(`/api/trips/${otherTrip.id}/links/${linkId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the link", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/links/${linkId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbLink = await db.tripLink.findUnique({ where: { id: linkId } });
    expect(dbLink).toBeNull();
  });

  it("does not delete the link when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/links/${linkId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbLink = await db.tripLink.findUnique({ where: { id: linkId } });
    expect(dbLink).not.toBeNull();
  });
});
