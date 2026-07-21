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
