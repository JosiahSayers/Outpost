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

describe("parseSlug", () => {
  it("recovers the notification name and in_app type", () => {
    expect(
      Notifications.parseSlug("notification_trip_status_update_in_app"),
    ).toEqual({ notification: "trip_status_update", type: "in_app" });
  });

  it("recovers the notification name and email type", () => {
    expect(
      Notifications.parseSlug("notification_trip_status_update_email"),
    ).toEqual({ notification: "trip_status_update", type: "email" });
  });

  it("returns null for a slug without the notification_ prefix", () => {
    expect(Notifications.parseSlug("weight_rollup")).toBeNull();
  });

  it("returns null for a notification slug without a recognized channel suffix", () => {
    expect(
      Notifications.parseSlug("notification_trip_status_update"),
    ).toBeNull();
  });

  it("round-trips with getSlug", () => {
    const slug = Notifications.getSlug("shared_gear_list_changes", "email");
    expect(Notifications.parseSlug(slug)).toEqual({
      notification: "shared_gear_list_changes",
      type: "email",
    });
  });
});
