import { transform } from "$/transformers/admin/user";
import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

const ZERO_COUNTS = {
  trips: 0,
  gearInventoryItems: 0,
  packingLists: 0,
  sessions: 0,
};

describe("transform", () => {
  it("returns the expected shape", () => {
    const user = make("User");

    expect(transform({ ...user, _count: ZERO_COUNTS })).toEqual({
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
      counts: {
        trips: 0,
        gearInventoryItems: 0,
        packingLists: 0,
        activeSessions: 0,
      },
    });
  });

  it("passes through null ban fields for a user who has never been banned", () => {
    const user = make("User", {
      banned: false,
      banReason: null,
      banExpires: null,
    });

    expect(transform({ ...user, _count: ZERO_COUNTS })).toMatchObject({
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

    expect(transform({ ...user, _count: ZERO_COUNTS })).toMatchObject({
      banned: true,
      banReason: "Spamming",
      banExpires,
    });
  });

  it("maps relation counts, renaming sessions to activeSessions", () => {
    const user = make("User");

    expect(
      transform({
        ...user,
        _count: {
          trips: 14,
          gearInventoryItems: 112,
          packingLists: 21,
          sessions: 2,
        },
      }),
    ).toMatchObject({
      counts: {
        trips: 14,
        gearInventoryItems: 112,
        packingLists: 21,
        activeSessions: 2,
      },
    });
  });
});
