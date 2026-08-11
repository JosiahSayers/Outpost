import { transform, transformWithCounts } from "$/transformers/admin/user";
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

describe("transformWithCounts", () => {
  it("returns the expected shape", () => {
    const user = make("User");

    expect(
      transformWithCounts({ ...user, _count: ZERO_COUNTS, twoFactors: [] }),
    ).toEqual({
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
      mfa: {
        enabled: false,
        enrolledAt: null,
      },
    });
  });

  it("maps relation counts, renaming sessions to activeSessions", () => {
    const user = make("User");

    expect(
      transformWithCounts({
        ...user,
        _count: {
          trips: 14,
          gearInventoryItems: 112,
          packingLists: 21,
          sessions: 2,
        },
        twoFactors: [],
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

  it("reports mfa as disabled with no enrollment date when the user has never enrolled", () => {
    const user = make("User", { twoFactorEnabled: false });

    expect(
      transformWithCounts({ ...user, _count: ZERO_COUNTS, twoFactors: [] }),
    ).toMatchObject({
      mfa: { enabled: false, enrolledAt: null },
    });
  });

  it("reports the verified two-factor record's createdAt as the enrollment date", () => {
    const user = make("User", { twoFactorEnabled: true });
    const enrolledAt = new Date("2024-03-01T00:00:00Z");

    expect(
      transformWithCounts({
        ...user,
        _count: ZERO_COUNTS,
        twoFactors: [{ createdAt: enrolledAt, verified: true }],
      }),
    ).toMatchObject({
      mfa: { enabled: true, enrolledAt },
    });
  });

  it("ignores an unverified two-factor record left over from an abandoned enrollment", () => {
    const user = make("User", { twoFactorEnabled: false });

    expect(
      transformWithCounts({
        ...user,
        _count: ZERO_COUNTS,
        twoFactors: [
          { createdAt: new Date("2024-03-01T00:00:00Z"), verified: false },
        ],
      }),
    ).toMatchObject({
      mfa: { enabled: false, enrolledAt: null },
    });
  });
});
