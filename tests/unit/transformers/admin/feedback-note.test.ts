import { transform } from "$/transformers/admin/feedback-note";
import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape with an admin", () => {
    const admin = make("User");
    const note = { ...make("FeedbackNote", { adminId: admin.id }), admin };

    expect(transform(note)).toEqual({
      id: note.id,
      createdAt: note.createdAt,
      message: note.message,
      userFacing: note.userFacing,
      admin: {
        id: admin.id,
        banExpires: admin.banExpires,
        banReason: admin.banReason,
        banned: admin.banned,
        createdAt: admin.createdAt,
        email: admin.email,
        emailVerified: admin.emailVerified,
        image: admin.image,
        name: admin.name,
        role: admin.role,
        updatedAt: admin.updatedAt,
      },
    });
  });

  it("passes through null admin for a note without one", () => {
    const note = { ...make("FeedbackNote", { adminId: null }), admin: null };

    expect(transform(note)).toMatchObject({
      admin: null,
    });
  });

  it("passes through userFacing true/false", () => {
    const admin = make("User");
    const userFacingNote = {
      ...make("FeedbackNote", { adminId: admin.id, userFacing: true }),
      admin,
    };
    const internalNote = { ...userFacingNote, userFacing: false };

    expect(transform(userFacingNote)).toMatchObject({ userFacing: true });
    expect(transform(internalNote)).toMatchObject({ userFacing: false });
  });
});
