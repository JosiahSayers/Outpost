import { transform } from "$/transformers/admin/user";
import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const user = make("User");

    expect(transform(user)).toEqual({
      id: user.id,
      banExpires: user.banExpires,
      banReason: user.banReason,
      banned: user.banned,
      createdAt: user.createdAt,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      name: user.name,
      role: user.role,
      updatedAt: user.updatedAt,
    });
  });

  it("passes through null ban fields for a user who has never been banned", () => {
    const user = make("User", {
      banned: false,
      banReason: null,
      banExpires: null,
    });

    expect(transform(user)).toMatchObject({
      banned: false,
      banReason: null,
      banExpires: null,
    });
  });

  it("passes through ban details for a banned user", () => {
    const banExpires = new Date();
    const user = make("User", {
      banned: true,
      banReason: "Spamming",
      banExpires,
    });

    expect(transform(user)).toMatchObject({
      banned: true,
      banReason: "Spamming",
      banExpires,
    });
  });
});
