import { transform } from "$/transformers/admin/session";
import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const session = make("Session");

    expect(transform(session)).toEqual({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      impersonatedBy: session.impersonatedBy,
      ipAddress: session.ipAddress,
      updatedAt: session.updatedAt,
      userAgent: session.userAgent,
      location: null,
    });
  });

  it("returns a null location when none was resolved", () => {
    const session = make("Session");

    expect(transform({ ...session, location: null })).toMatchObject({
      location: null,
    });
  });

  it("transforms a resolved location", () => {
    const session = make("Session");

    expect(
      transform({
        ...session,
        location: {
          city: { geoname_id: 1, names: { en: "Sydney" } },
          country: {
            geoname_id: 2,
            iso_code: "AU",
            names: { en: "Australia" },
          },
          subdivisions: [
            {
              geoname_id: 3,
              iso_code: "NSW",
              names: { en: "New South Wales" },
            },
          ],
        },
      }),
    ).toMatchObject({
      location: {
        city: "Sydney",
        country: "Australia",
        subdivisions: ["New South Wales"],
      },
    });
  });

  it("passes through null impersonatedBy for a session that isn't impersonated", () => {
    const session = make("Session", { impersonatedBy: null });

    expect(transform(session)).toMatchObject({
      impersonatedBy: null,
    });
  });

  it("passes through the admin id for an impersonated session", () => {
    const session = make("Session", { impersonatedBy: "admin-user-id" });

    expect(transform(session)).toMatchObject({
      impersonatedBy: "admin-user-id",
    });
  });
});
