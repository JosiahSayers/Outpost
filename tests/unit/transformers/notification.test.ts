import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  it("returns the expected shape", () => {
    const notification = make("Notification");
    expect(transformers.notification(notification)).toEqual({
      id: notification.id,
      title: notification.title,
      description: notification.description,
      read: notification.read,
      dismissed: notification.dismissed,
      createdAt: notification.createdAt,
      icon: notification.icon,
    });
  });

  it("does not leak internal fields", () => {
    const notification = make("Notification");
    const result = transformers.notification(notification);
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("passes through null optional fields", () => {
    const notification = make("Notification", {
      description: null,
      icon: null,
    });
    expect(transformers.notification(notification)).toMatchObject({
      description: null,
      icon: null,
    });
  });
});
