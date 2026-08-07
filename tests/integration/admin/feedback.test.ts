import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let adminAuthCookies: Array<string>;
let userId: string;
let adminId: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  adminAuthCookies = await getAuthCookies("admin@test.com");

  const user = await db.user.findUnique({ where: { email: "user@test.com" } });
  const admin = await db.user.findUnique({
    where: { email: "admin@test.com" },
  });
  userId = user!.id;
  adminId = admin!.id;
});

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/feedback").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/feedback")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 200 with an empty pagination response when there is no feedback", async () => {
    const response = await request(app)
      .get("/admin/feedback")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ feedback: [], total: 0, pageSize: 10 });
  });

  it("only returns feedback with a default (non-terminal) status", async () => {
    const included = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    await db.feedback.create({
      data: make("Feedback", { userId, status: "completed" }),
    });
    await db.feedback.create({
      data: make("Feedback", { userId, status: "declined" }),
    });

    const response = await request(app)
      .get("/admin/feedback")
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback).toEqual([
      expect.objectContaining({ id: included.id }),
    ]);
  });

  it("filters by an explicit status query param", async () => {
    await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const completed = await db.feedback.create({
      data: make("Feedback", { userId, status: "completed" }),
    });

    const response = await request(app)
      .get("/admin/feedback")
      .query({ status: "completed" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback).toEqual([
      expect.objectContaining({ id: completed.id }),
    ]);
  });

  it("accepts multiple repeated status query params", async () => {
    const newOne = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const completed = await db.feedback.create({
      data: make("Feedback", { userId, status: "completed" }),
    });
    await db.feedback.create({
      data: make("Feedback", { userId, status: "declined" }),
    });

    const response = await request(app)
      .get("/admin/feedback")
      .query({ status: ["new", "completed"] })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: newOne.id }),
        expect.objectContaining({ id: completed.id }),
      ]),
    );
    expect(response.body.feedback).toHaveLength(2);
  });

  it("excludes feedback marked as a duplicate from the results", async () => {
    const root = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    await db.feedback.create({
      data: make("Feedback", {
        userId,
        status: "new",
        duplicateId: root.id,
      }),
    });

    const response = await request(app)
      .get("/admin/feedback")
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback).toEqual([
      expect.objectContaining({ id: root.id }),
    ]);
    expect(response.body.total).toBe(1);
  });

  it("orders results by createdAt descending", async () => {
    const older = await db.feedback.create({
      data: make("Feedback", {
        userId,
        status: "new",
        createdAt: new Date("2026-01-01"),
      }),
    });
    const newer = await db.feedback.create({
      data: make("Feedback", {
        userId,
        status: "new",
        createdAt: new Date("2026-02-01"),
      }),
    });

    const response = await request(app)
      .get("/admin/feedback")
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback.map((f: { id: string }) => f.id)).toEqual([
      newer.id,
      older.id,
    ]);
  });

  it("paginates results using take and skip", async () => {
    await db.feedback.createMany({
      data: [
        make("Feedback", { userId, status: "new" }),
        make("Feedback", { userId, status: "new" }),
        make("Feedback", { userId, status: "new" }),
      ],
    });

    const response = await request(app)
      .get("/admin/feedback")
      .query({ take: 2, skip: 1 })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback).toHaveLength(2);
    expect(response.body.total).toBe(3);
    expect(response.body.pageSize).toBe(2);
  });

  it("rejects an invalid status", async () => {
    const response = await request(app)
      .get("/admin/feedback")
      .query({ status: "bogus" })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "query",
        errors: [
          expect.objectContaining({
            code: "invalid_value",
            path: ["status", 0],
          }),
        ],
      }),
    ]);
  });

  it("rejects a take above the maximum", async () => {
    const response = await request(app)
      .get("/admin/feedback")
      .query({ take: 100 })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "query",
        errors: [
          expect.objectContaining({
            code: "too_big",
            path: ["take"],
          }),
        ],
      }),
    ]);
  });
});

describe("GET /:id", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/feedback/some-id").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/feedback/some-id")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a feedback id that doesn't exist", async () => {
    await request(app)
      .get("/admin/feedback/does-not-exist")
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("returns the full feedback with notes, audit logs, and duplicates", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", { feedbackId: feedback.id, adminId }),
    });
    const auditLog = await db.feedbackAuditLog.create({
      data: make("FeedbackAuditLog", { feedbackId: feedback.id, adminId }),
    });
    const duplicate = await db.feedback.create({
      data: make("Feedback", {
        userId,
        status: "new",
        duplicateId: feedback.id,
      }),
    });

    const response = await request(app)
      .get(`/admin/feedback/${feedback.id}`)
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.feedback).toMatchObject({
      id: feedback.id,
      status: feedback.status,
      text: feedback.text,
      duplicateId: null,
      notes: [
        expect.objectContaining({
          id: note.id,
          message: note.message,
          admin: expect.objectContaining({ id: adminId }),
        }),
      ],
      auditLogs: [
        expect.objectContaining({
          id: auditLog.id,
          changeDescription: auditLog.changeDescription,
          admin: expect.objectContaining({ id: adminId }),
        }),
      ],
      duplicates: [expect.objectContaining({ id: duplicate.id })],
      user: expect.objectContaining({ id: userId }),
    });
  });

  it("does not leak notes or audit logs belonging to other feedback", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const otherFeedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    await db.feedbackNote.create({
      data: make("FeedbackNote", { feedbackId: otherFeedback.id, adminId }),
    });
    await db.feedbackAuditLog.create({
      data: make("FeedbackAuditLog", {
        feedbackId: otherFeedback.id,
        adminId,
      }),
    });

    const response = await request(app)
      .get(`/admin/feedback/${feedback.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feedback.notes).toEqual([]);
    expect(response.body.feedback.auditLogs).toEqual([]);
  });
});

describe("PATCH /:id", () => {
  it("requires a valid session", async () => {
    await request(app)
      .patch("/admin/feedback/some-id")
      .send({ status: "triaged" })
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .patch("/admin/feedback/some-id")
      .send({ status: "triaged" })
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a feedback id that doesn't exist", async () => {
    await request(app)
      .patch("/admin/feedback/does-not-exist")
      .send({ status: "triaged" })
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("updates the status and returns the updated feedback", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}`)
      .send({ status: "triaged" })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      feedback: expect.objectContaining({
        id: feedback.id,
        status: "triaged",
      }),
    });

    const updated = await db.feedback.findUnique({
      where: { id: feedback.id },
    });
    expect(updated?.status).toBe("triaged");
  });

  it("creates an audit log entry describing the status change", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}`)
      .send({ status: "triaged" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const auditLogs = await db.feedbackAuditLog.findMany({
      where: { feedbackId: feedback.id },
    });
    expect(auditLogs).toEqual([
      expect.objectContaining({
        feedbackId: feedback.id,
        adminId,
        changeDescription: "Status change: new -> triaged",
      }),
    ]);
  });

  it("rejects an invalid status", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}`)
      .send({ status: "bogus" })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["status"] })],
      }),
    ]);
  });

  it("rejects unrecognized fields", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}`)
      .send({ status: "triaged", notAField: true })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ code: "unrecognized_keys" })],
      }),
    ]);
  });
});

describe("POST /:id/notes", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post("/admin/feedback/some-id/notes")
      .send({ message: "a note" })
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .post("/admin/feedback/some-id/notes")
      .send({ message: "a note" })
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a feedback id that doesn't exist", async () => {
    await request(app)
      .post("/admin/feedback/does-not-exist/notes")
      .send({ message: "a note" })
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("creates a note attached to the feedback and the authenticated admin", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .post(`/admin/feedback/${feedback.id}/notes`)
      .send({ message: "Looking into this." })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      note: expect.objectContaining({
        message: "Looking into this.",
        userFacing: false,
        admin: expect.objectContaining({ id: adminId }),
      }),
    });

    const note = await db.feedbackNote.findUnique({
      where: { id: response.body.note.id },
    });
    expect(note).toMatchObject({
      feedbackId: feedback.id,
      adminId,
      message: "Looking into this.",
      userFacing: false,
    });
  });

  it("defaults userFacing to false when omitted", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .post(`/admin/feedback/${feedback.id}/notes`)
      .send({ message: "a note" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.note.userFacing).toBe(false);
  });

  it("respects an explicit userFacing value", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .post(`/admin/feedback/${feedback.id}/notes`)
      .send({ message: "a note", userFacing: true })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.note.userFacing).toBe(true);
  });

  it("rejects a missing message", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .post(`/admin/feedback/${feedback.id}/notes`)
      .send({})
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["message"] })],
      }),
    ]);
  });

  it("rejects unrecognized fields", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .post(`/admin/feedback/${feedback.id}/notes`)
      .send({ message: "a note", notAField: true })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ code: "unrecognized_keys" })],
      }),
    ]);
  });

  it("rejects a message longer than 1500 characters", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    const response = await request(app)
      .post(`/admin/feedback/${feedback.id}/notes`)
      .send({ message: "a".repeat(1501) })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [
          expect.objectContaining({ code: "too_big", path: ["message"] }),
        ],
      }),
    ]);
  });
});

describe("PATCH /:id/notes/:noteId", () => {
  it("requires a valid session", async () => {
    await request(app)
      .patch("/admin/feedback/some-id/notes/some-note-id")
      .send({ message: "updated" })
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .patch("/admin/feedback/some-id/notes/some-note-id")
      .send({ message: "updated" })
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a feedback id that doesn't exist", async () => {
    await request(app)
      .patch("/admin/feedback/does-not-exist/notes/some-note-id")
      .send({ message: "updated" })
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("returns a 404 for a note id that doesn't exist", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/does-not-exist`)
      .send({ message: "updated" })
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("returns a 404 when the note exists but belongs to a different feedback", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const otherFeedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", { feedbackId: otherFeedback.id, adminId }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ message: "updated" })
      .set("Cookie", adminAuthCookies)
      .expect(404);

    const unchanged = await db.feedbackNote.findUnique({
      where: { id: note.id },
    });
    expect(unchanged?.message).toBe(note.message);
  });

  it("updates the note's message", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        message: "original",
        userFacing: false,
      }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ message: "updated message" })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      note: expect.objectContaining({
        id: note.id,
        message: "updated message",
        userFacing: false,
      }),
    });
  });

  it("updates the note's userFacing flag", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        userFacing: false,
      }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ userFacing: true })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.note.userFacing).toBe(true);
    expect(response.body.note.message).toBe(note.message);
  });

  it("leaves fields unchanged when the body omits them", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        message: "original",
        userFacing: true,
      }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({})
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.note).toEqual(
      expect.objectContaining({ message: "original", userFacing: true }),
    );
  });

  it("rejects unrecognized fields", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", { feedbackId: feedback.id, adminId }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ message: "updated", notAField: true })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ code: "unrecognized_keys" })],
      }),
    ]);
  });

  it("rejects a message longer than 1500 characters", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", { feedbackId: feedback.id, adminId }),
    });

    const response = await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ message: "a".repeat(1501) })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [
          expect.objectContaining({ code: "too_big", path: ["message"] }),
        ],
      }),
    ]);
  });

  it("logs an audit entry when the message changes", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        message: "original",
      }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ message: "updated message" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const auditLogs = await db.feedbackAuditLog.findMany({
      where: { feedbackId: feedback.id },
    });
    expect(auditLogs).toEqual([
      expect.objectContaining({
        feedbackId: feedback.id,
        adminId,
        changeDescription: `Note (${note.id}) message updated`,
      }),
    ]);
  });

  it("does not log an audit entry when the message is resent unchanged", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        message: "original",
      }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ message: "original" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const auditLogs = await db.feedbackAuditLog.findMany({
      where: { feedbackId: feedback.id },
    });
    expect(auditLogs).toEqual([]);
  });

  it("logs an audit entry when userFacing is toggled from true to false", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        userFacing: true,
      }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ userFacing: false })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const auditLogs = await db.feedbackAuditLog.findMany({
      where: { feedbackId: feedback.id },
    });
    expect(auditLogs).toEqual([
      expect.objectContaining({
        feedbackId: feedback.id,
        adminId,
        changeDescription: `Note (${note.id}) user facing change: true -> false`,
      }),
    ]);
  });

  it("logs an audit entry when userFacing is toggled from false to true", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        userFacing: false,
      }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({ userFacing: true })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const auditLogs = await db.feedbackAuditLog.findMany({
      where: { feedbackId: feedback.id },
    });
    expect(auditLogs).toEqual([
      expect.objectContaining({
        feedbackId: feedback.id,
        adminId,
        changeDescription: `Note (${note.id}) user facing change: false -> true`,
      }),
    ]);
  });

  it("does not log an audit entry when the body omits both fields", async () => {
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId, status: "new" }),
    });
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId,
        message: "original",
        userFacing: true,
      }),
    });

    await request(app)
      .patch(`/admin/feedback/${feedback.id}/notes/${note.id}`)
      .send({})
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const auditLogs = await db.feedbackAuditLog.findMany({
      where: { feedbackId: feedback.id },
    });
    expect(auditLogs).toEqual([]);
  });
});
