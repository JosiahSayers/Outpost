import { inferMetadataQueue } from "$/jobs/workers/feedback/infer-metadata";
import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";

let authCookies: Array<string>;
let userId: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();

  const user = await db.user.findUnique({ where: { email: "user@test.com" } });
  userId = user!.id;
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post("/api/feedback")
      .send({ text: "This is some valid feedback text." })
      .expect(401);
  });

  it("rejects text shorter than 15 characters", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .send({ text: "too short" })
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
              "message": "Too small: expected string to have >=15 characters",
              "minimum": 15,
              "origin": "string",
              "path": [
                "text",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects text longer than 750 characters", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .send({ text: "a".repeat(751) })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_big",
              "inclusive": true,
              "maximum": 750,
              "message": "Too big: expected string to have <=750 characters",
              "origin": "string",
              "path": [
                "text",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects a missing text field", async () => {
    const response = await request(app)
      .post("/api/feedback")
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
                "text",
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
      .post("/api/feedback")
      .send({ text: "This is some valid feedback text.", notAField: true })
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

  it("creates feedback for the authenticated user and returns a referenceId", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .send({
        text: "This is some valid feedback text.",
        submittedOnPage: "/dashboard",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ referenceId: expect.any(String) });

    const feedback = await db.feedback.findUnique({
      where: { id: response.body.referenceId },
    });
    expect(feedback).toMatchObject({
      text: "This is some valid feedback text.",
      submittedOnPage: "/dashboard",
      userId,
      status: "new",
    });
  });

  it("defaults submittedOnPage to 'unknown' when omitted", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .send({ text: "This is some valid feedback text." })
      .set("Cookie", authCookies)
      .expect(200);

    const feedback = await db.feedback.findUnique({
      where: { id: response.body.referenceId },
    });
    expect(feedback).toMatchObject({ submittedOnPage: "unknown" });
  });

  it("truncates submittedOnPage longer than 1000 characters instead of rejecting it", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .send({
        text: "This is some valid feedback text.",
        submittedOnPage: "a".repeat(1001),
      })
      .set("Cookie", authCookies)
      .expect(200);

    const feedback = await db.feedback.findUnique({
      where: { id: response.body.referenceId },
    });
    expect(feedback?.submittedOnPage).toBe("a".repeat(1000));
  });

  it("enqueues an infer-metadata job for the new feedback", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .send({ text: "This is some valid feedback text." })
      .set("Cookie", authCookies)
      .expect(200);

    // A worker process running against this same Redis instance (e.g. `bun
    // run dev:workers`) could pick the job up before this assertion runs, so
    // look across every state rather than assuming "waiting".
    const jobs = await inferMetadataQueue.getJobs([
      "waiting",
      "active",
      "delayed",
      "completed",
    ]);
    const job = jobs.find(
      (j) => j.data.feedbackId === response.body.referenceId,
    );
    expect(job).toBeDefined();
    expect(job!.name).toBe("infer-feedback-metadata");

    // Best-effort cleanup -- a concurrently-running worker may have already
    // completed/removed this job, or be actively holding a lock on it.
    await job?.remove().catch(() => {});
  });
});
