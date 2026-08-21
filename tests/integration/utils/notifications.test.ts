import { Notifications } from "$/utils/notifications";
import { describe, expect, it } from "bun:test";

describe("getSlug", () => {
  it("builds the in_app slug", () => {
    expect(Notifications.getSlug("trip_status_update", "in_app")).toBe(
      "notification_trip_status_update_in_app",
    );
  });

  it("builds the email slug", () => {
    expect(Notifications.getSlug("trip_status_update", "email")).toBe(
      "notification_trip_status_update_email",
    );
  });
});
