import { transform, transformFull } from "$/transformers/admin/feedback";
import { transform as userTransform } from "$/transformers/admin/user";
import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const feedback = make("Feedback");

    expect(transform(feedback)).toEqual({
      id: feedback.id,
      createdAt: feedback.createdAt,
      duplicateId: feedback.duplicateId,
      inferredSubject: feedback.inferredSubject,
      inferredTopic: feedback.inferredTopic,
      status: feedback.status,
      text: feedback.text,
    });
  });

  it("passes through null duplicateId for feedback that isn't a duplicate", () => {
    const feedback = make("Feedback", { duplicateId: null });

    expect(transform(feedback)).toMatchObject({
      duplicateId: null,
    });
  });

  it("passes through the original feedback id for a duplicate", () => {
    const feedback = make("Feedback", { duplicateId: "original-feedback-id" });

    expect(transform(feedback)).toMatchObject({
      duplicateId: "original-feedback-id",
    });
  });
});

describe("transformFull", () => {
  it("returns the expected shape with empty relations", () => {
    const feedback = make("Feedback");
    const user = make("User");
    const full = {
      ...feedback,
      feedbackNotes: [],
      feedbackAuditLogs: [],
      duplicates: [],
      user,
    };

    expect(transformFull(full)).toEqual({
      ...transform(feedback),
      notes: [],
      auditLogs: [],
      duplicates: [],
      user: userTransform(user),
    });
  });

  it("transforms notes, audit logs, and duplicates", () => {
    const feedback = make("Feedback");
    const admin = make("User");
    const note = {
      ...make("FeedbackNote", { feedbackId: feedback.id, adminId: admin.id }),
      admin,
    };
    const auditLog = {
      ...make("FeedbackAuditLog", {
        feedbackId: feedback.id,
        adminId: admin.id,
      }),
      admin,
    };
    const duplicate = make("Feedback");
    const user = make("User");
    const full = {
      ...feedback,
      feedbackNotes: [note],
      feedbackAuditLogs: [auditLog],
      duplicates: [duplicate],
      user,
    };

    expect(transformFull(full)).toEqual({
      ...transform(feedback),
      notes: [
        {
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
        },
      ],
      auditLogs: [
        {
          id: auditLog.id,
          createdAt: auditLog.createdAt,
          changeDescription: auditLog.changeDescription,
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
        },
      ],
      duplicates: [transform(duplicate)],
      user: userTransform(user),
    });
  });

  it("passes through null admin for notes and audit logs without an admin", () => {
    const feedback = make("Feedback");
    const note = {
      ...make("FeedbackNote", { feedbackId: feedback.id, adminId: null }),
      admin: null,
    };
    const auditLog = {
      ...make("FeedbackAuditLog", { feedbackId: feedback.id, adminId: null }),
      admin: null,
    };
    const full = {
      ...feedback,
      feedbackNotes: [note],
      feedbackAuditLogs: [auditLog],
      duplicates: [],
      user: make("User"),
    };

    expect(transformFull(full)).toMatchObject({
      notes: [{ admin: null }],
      auditLogs: [{ admin: null }],
    });
  });
});
