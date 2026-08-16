import type { TripFileR2Client } from "$/routers/api/trip/file";
import { app } from "$/server";
import { db } from "$/utils/db";
import { Features } from "$/utils/features";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

const TEN_MB = 1e7;

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;
let userId: string;
let tripId: string;
let fakeR2Client: {
  write: ReturnType<typeof mock>;
  presign: ReturnType<typeof mock>;
  delete: ReturnType<typeof mock>;
};

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");

  const user = await db.user.findUnique({ where: { email: "user@test.com" } });
  userId = user!.id;
  const trip = await db.trip.create({
    data: make("Trip", { name: "Appalachian Trail", userId }),
  });
  tripId = trip.id;

  await Features.enableForUser("trip-file-upload", userId);
  const user2 = await db.user.findUnique({
    where: { email: "user2@test.com" },
  });
  await Features.enableForUser("trip-file-upload", user2!.id);

  // Real R2 is neither reachable in CI (no R2_* env vars, so createR2Client
  // returns null) nor safe to hit locally (.env points at a real dev
  // bucket) -- app.locals.r2Client overrides it for the life of the app
  // singleton, see getR2Client in app/routers/api/trip/file.ts.
  fakeR2Client = {
    write: mock(async () => {}),
    presign: mock(() => "https://r2.example.com/signed-url"),
    delete: mock(async () => {}),
  };
  app.locals.r2Client = fakeR2Client as unknown as TripFileR2Client;
});

afterEach(() => {
  delete app.locals.r2Client;
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/files")
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("does not create a file when the owning user check fails", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const files = await db.file.findMany({ where: { tripId } });
    expect(files).toHaveLength(0);
    expect(fakeR2Client.write).not.toHaveBeenCalled();
  });

  it("returns 403 when the uploader lacks the trip-file-upload feature flag", async () => {
    await Features.disableForUser("trip-file-upload", userId);

    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(403);

    expect(fakeR2Client.write).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is attached", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({ error: "No file uploaded" });
  });

  it("rejects a file over the 10MB size limit", async () => {
    const oversized = Buffer.alloc(TEN_MB + 1, "a");

    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", oversized, "huge.txt")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      error: "File exceeds the 10MB size limit",
    });

    const files = await db.file.findMany({ where: { tripId } });
    expect(files).toHaveLength(0);
    expect(fakeR2Client.write).not.toHaveBeenCalled();
  });

  it("accepts a file just under the 10MB size limit", async () => {
    const underLimit = Buffer.alloc(TEN_MB - 1, "a");

    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", underLimit, "under-limit.txt")
      .set("Cookie", authCookies)
      .expect(201);
  });

  it("rejects a second file attached under the same field", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("one"), "one.txt")
      .attach("file", Buffer.from("two"), "two.txt")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      error: "Only one file, in the 'file' field, may be uploaded at a time",
    });

    const files = await db.file.findMany({ where: { tripId } });
    expect(files).toHaveLength(0);
    expect(fakeR2Client.write).not.toHaveBeenCalled();
  });

  it("rejects a file attached under an unexpected field name", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("document", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual({
      error: "Only one file, in the 'file' field, may be uploaded at a time",
    });

    const files = await db.file.findMany({ where: { tripId } });
    expect(files).toHaveLength(0);
  });

  it("returns 409 when a file with the same name already exists on the trip", async () => {
    await db.file.create({
      data: {
        tripId,
        r2Key: `${userId}/trips/${tripId}/files/existing`,
        contentType: "text/plain",
        filename: "notes.txt",
        bytes: 5,
      },
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(409);

    expect(response.body).toEqual({
      error: "File with this name already exists on this trip",
    });
    expect(fakeR2Client.write).not.toHaveBeenCalled();
  });

  it("allows the same filename on a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });
    await db.file.create({
      data: {
        tripId: otherTrip.id,
        r2Key: `${userId}/trips/${otherTrip.id}/files/existing`,
        contentType: "text/plain",
        filename: "notes.txt",
        bytes: 5,
      },
    });

    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(201);
  });

  it("uploads a file and returns it", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello world"), {
        filename: "notes.txt",
        contentType: "text/plain",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      file: {
        id: expect.any(String),
        bytes: 11,
        contentType: "text/plain",
        filename: "notes.txt",
        createdAt: expect.any(String),
      },
    });
  });

  it("persists the file to the database, scoped to the trip", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello world"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(201);

    const dbFile = await db.file.findUnique({
      where: { id: response.body.file.id },
    });
    expect(dbFile?.tripId).toBe(tripId);
    expect(dbFile?.filename).toBe("notes.txt");
    expect(dbFile?.bytes).toBe(11);
  });

  it("writes the file contents to R2 under a key scoped to the user and trip", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello world"), {
        filename: "notes.txt",
        contentType: "text/plain",
      })
      .set("Cookie", authCookies)
      .expect(201);

    expect(fakeR2Client.write).toHaveBeenCalledTimes(1);
    const [key, data, options] = fakeR2Client.write.mock.calls[0]!;
    expect(key).toMatch(new RegExp(`^${userId}/trips/${tripId}/files/`));
    expect(Buffer.from(data as Uint8Array).toString()).toBe("hello world");
    expect(options).toEqual({ type: "text/plain" });
  });

  it("stores the file under a random key, never derived from the filename", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(201);

    expect(fakeR2Client.write).toHaveBeenCalledTimes(1);
    const [key] = fakeR2Client.write.mock.calls[0]!;
    // The key is `${userId}/trips/${tripId}/files/<uuid>` -- it never
    // incorporates the client-supplied filename, so nothing the client sends
    // as a filename (however malicious) can influence where the object is
    // stored.
    expect(key as string).not.toContain("notes.txt");
    expect(key as string).toMatch(
      new RegExp(`^${userId}/trips/${tripId}/files/[0-9a-f-]{36}$`),
    );
  });

  it("strips directory components from a path-traversal filename before storing it", async () => {
    // busboy itself reduces any filename with a `/` or `\` to its basename
    // (see node_modules/busboy/lib/utils.js) -- this documents that existing
    // protection rather than anything file.ts does itself.
    const response = await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "../../etc/passwd")
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.file.filename).toBe("passwd");
  });

  it("returns 500 and does not persist a file record when the R2 write fails", async () => {
    fakeR2Client.write.mockImplementation(async () => {
      throw new Error("R2 unavailable");
    });

    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(500);

    const files = await db.file.findMany({ where: { tripId } });
    expect(files).toHaveLength(0);
  });

  it("returns 500 when R2 is not configured", async () => {
    app.locals.r2Client = null;

    await request(app)
      .post(`/api/trips/${tripId}/files`)
      .attach("file", Buffer.from("hello"), "notes.txt")
      .set("Cookie", authCookies)
      .expect(500);

    const files = await db.file.findMany({ where: { tripId } });
    expect(files).toHaveLength(0);
  });
});

describe("GET /:fileId", () => {
  let fileId: string;

  beforeEach(async () => {
    const file = await db.file.create({
      data: {
        tripId,
        r2Key: `${userId}/trips/${tripId}/files/some-uuid`,
        contentType: "text/plain",
        filename: "notes.txt",
        bytes: 5,
      },
    });
    fileId = file.id;
  });

  it("requires a valid session", async () => {
    await request(app).get(`/api/trips/${tripId}/files/${fileId}`).expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .get(`/api/trips/does-not-exist/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the file does not exist", async () => {
    await request(app)
      .get(`/api/trips/${tripId}/files/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the file belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .get(`/api/trips/${otherTrip.id}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("does not require the trip-file-upload feature flag", async () => {
    await Features.disableForUser("trip-file-upload", userId);

    await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(302);
  });

  it("handles a fileId containing quote/SQL-like characters as a plain lookup miss", async () => {
    await request(app)
      .get(`/api/trips/${tripId}/files/${encodeURIComponent("' OR '1'='1")}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("redirects to a presigned download URL", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(302);

    expect(response.headers.location).toBe("https://r2.example.com/signed-url");
  });

  it("presigns using the file's stored r2Key, content type, and a sanitized content-disposition", async () => {
    await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(302);

    expect(fakeR2Client.presign).toHaveBeenCalledTimes(1);
    const [key, options] = fakeR2Client.presign.mock.calls[0]!;
    expect(key).toBe(`${userId}/trips/${tripId}/files/some-uuid`);
    expect(options).toEqual({
      method: "GET",
      expiresIn: 3600,
      contentDisposition:
        "attachment; filename=\"notes.txt\"; filename*=UTF-8''notes.txt",
      type: "text/plain",
    });
  });

  it("strips CRLF and path segments from a malicious filename before presigning", async () => {
    const malicious = await db.file.create({
      data: {
        tripId,
        r2Key: `${userId}/trips/${tripId}/files/malicious-uuid`,
        contentType: "text/plain",
        filename: "../../secret\r\nX-Injected: 1.txt",
        bytes: 5,
      },
    });

    await request(app)
      .get(`/api/trips/${tripId}/files/${malicious.id}`)
      .set("Cookie", authCookies)
      .expect(302);

    const [, options] = fakeR2Client.presign.mock.calls[0]!;
    const contentDisposition = (options as { contentDisposition: string })
      .contentDisposition;
    expect(contentDisposition).not.toContain("\r");
    expect(contentDisposition).not.toContain("\n");
    expect(contentDisposition).not.toContain("..");
  });

  it("returns 500 when R2 is not configured", async () => {
    app.locals.r2Client = null;

    await request(app)
      .get(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(500);
  });
});

describe("DELETE /:fileId", () => {
  let fileId: string;

  beforeEach(async () => {
    const file = await db.file.create({
      data: {
        tripId,
        r2Key: `${userId}/trips/${tripId}/files/some-uuid`,
        contentType: "text/plain",
        filename: "notes.txt",
        bytes: 5,
      },
    });
    fileId = file.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete(`/api/trips/does-not-exist/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("does not delete the file when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const file = await db.file.findUnique({ where: { id: fileId } });
    expect(file).not.toBeNull();
    expect(fakeR2Client.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the file does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/files/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the file belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .delete(`/api/trips/${otherTrip.id}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(404);

    const file = await db.file.findUnique({ where: { id: fileId } });
    expect(file).not.toBeNull();
  });

  it("does not require the trip-file-upload feature flag", async () => {
    await Features.disableForUser("trip-file-upload", userId);

    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(200);
  });

  it("deletes the file record from the database", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const file = await db.file.findUnique({ where: { id: fileId } });
    expect(file).toBeNull();
  });

  it("deletes the object from R2 using the file's stored r2Key", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(200);

    expect(fakeR2Client.delete).toHaveBeenCalledTimes(1);
    expect(fakeR2Client.delete.mock.calls[0]![0]).toBe(
      `${userId}/trips/${tripId}/files/some-uuid`,
    );
  });

  it("returns 500 when R2 is not configured", async () => {
    app.locals.r2Client = null;

    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(500);

    const file = await db.file.findUnique({ where: { id: fileId } });
    expect(file).not.toBeNull();
  });

  it("returns 500 and does not delete the database record when the R2 delete fails", async () => {
    fakeR2Client.delete.mockImplementation(async () => {
      throw new Error("R2 unavailable");
    });

    await request(app)
      .delete(`/api/trips/${tripId}/files/${fileId}`)
      .set("Cookie", authCookies)
      .expect(500);

    const file = await db.file.findUnique({ where: { id: fileId } });
    expect(file).not.toBeNull();
  });
});
