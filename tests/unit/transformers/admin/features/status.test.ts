import { transform } from "$/transformers/admin/features/status";
import { FEATURE_META } from "$/utils/features";
import { describe, expect, it } from "bun:test";
import { make } from "../../../../helpers/test-data/make";

const FEATURE_STATUS = {
  meta: FEATURE_META["trip-file-upload"],
  enabled: false,
  disabledUserIds: [],
};

describe("transform", () => {
  it("returns the expected shape", () => {
    expect(transform(FEATURE_STATUS, [])).toEqual({
      meta: FEATURE_STATUS.meta,
      enabled: false,
      disabledUserIds: [],
      enabledUsers: [],
    });
  });

  it("passes through enabled and disabledUserIds unchanged", () => {
    const status = {
      meta: FEATURE_META["trip-file-upload"],
      enabled: true,
      disabledUserIds: ["user-1", "user-2"],
    };

    expect(transform(status, [])).toMatchObject({
      enabled: true,
      disabledUserIds: ["user-1", "user-2"],
    });
  });

  it("transforms enabled users into client admin users", () => {
    const user = make("User");

    expect(transform(FEATURE_STATUS, [user])).toMatchObject({
      enabledUsers: [
        {
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
        },
      ],
    });
  });

  it("preserves the order of enabled users", () => {
    const first = make("User");
    const second = make("User");

    expect(transform(FEATURE_STATUS, [first, second])).toMatchObject({
      enabledUsers: [{ id: first.id }, { id: second.id }],
    });
  });
});
