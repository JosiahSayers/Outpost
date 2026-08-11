import { app } from "$/server";
import { statSort } from "$/utils/admin/stats";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";

let authCookies: Array<string>;
let adminAuthCookies: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  adminAuthCookies = await getAuthCookies("admin@test.com");
});

describe("GET /stats", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/dashboard/stats").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns the sort position for every supported stat", async () => {
    const response = await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ statsWithSortPosition: statSort });
  });
});

describe("GET /stats/:stat", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/dashboard/stats/failed_jobs").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/dashboard/stats/failed_jobs")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns the computed stat for a supported stat name", async () => {
    const response = await request(app)
      .get("/admin/dashboard/stats/failed_jobs")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      stat: {
        stat: "failed_jobs",
        label: "Failed Jobs",
        value: "0",
        delta: "Jobs are looking good",
        trend: "up",
        sort: statSort["failed_jobs"],
      },
    });
  });

  it("returns a validation error for an unsupported stat name", async () => {
    const response = await request(app)
      .get("/admin/dashboard/stats/not_a_real_stat")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchObject([{ type: "params" }]);
  });
});
