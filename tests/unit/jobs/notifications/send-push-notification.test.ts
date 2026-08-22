import { calculatePushDelayMs } from "$/jobs/workers/notifications/send-push-notification";
import { DateTime } from "luxon";
import { describe, expect, it } from "bun:test";

describe("calculatePushDelayMs", () => {
  it("does not delay a push sent well within the day", () => {
    const now = DateTime.fromObject(
      { hour: 14, minute: 0 },
      { zone: "America/New_York" },
    );
    expect(calculatePushDelayMs("America/New_York", now)).toBe(0);
  });

  it("does not delay a push sent right before the overnight window (8:59pm)", () => {
    const now = DateTime.fromObject(
      { hour: 20, minute: 59 },
      { zone: "America/New_York" },
    );
    expect(calculatePushDelayMs("America/New_York", now)).toBe(0);
  });

  it("delays a push sent right at the start of the overnight window (9:00pm) until 7am the same night's morning", () => {
    const now = DateTime.fromObject(
      { hour: 21, minute: 0 },
      { zone: "America/New_York" },
    );
    const delay = calculatePushDelayMs("America/New_York", now);
    expect(now.plus({ milliseconds: delay }).toFormat("HH:mm")).toBe("07:00");
    expect(now.plus({ milliseconds: delay }).day).toBe(now.day + 1);
  });

  it("delays a push sent in the middle of the night (2am) until 7am the same morning", () => {
    const now = DateTime.fromObject(
      { hour: 2, minute: 0 },
      { zone: "America/New_York" },
    );
    const delay = calculatePushDelayMs("America/New_York", now);
    expect(now.plus({ milliseconds: delay }).toFormat("HH:mm")).toBe("07:00");
    expect(now.plus({ milliseconds: delay }).day).toBe(now.day);
  });

  it("delays a push sent right before the morning cutoff (6:59am)", () => {
    const now = DateTime.fromObject(
      { hour: 6, minute: 59 },
      { zone: "America/New_York" },
    );
    const delay = calculatePushDelayMs("America/New_York", now);
    expect(delay).toBeGreaterThan(0);
    expect(now.plus({ milliseconds: delay }).toFormat("HH:mm")).toBe("07:00");
  });

  it("does not delay a push sent right at the morning cutoff (7:00am)", () => {
    const now = DateTime.fromObject(
      { hour: 7, minute: 0 },
      { zone: "America/New_York" },
    );
    expect(calculatePushDelayMs("America/New_York", now)).toBe(0);
  });

  it("falls back to America/New_York when the subscription has no stored timezone", () => {
    const nowEastern = DateTime.fromObject(
      { hour: 23, minute: 0 },
      { zone: "America/New_York" },
    );
    const delay = calculatePushDelayMs(null, nowEastern);
    expect(nowEastern.plus({ milliseconds: delay }).toFormat("HH:mm")).toBe(
      "07:00",
    );
  });

  it("computes the overnight window against the subscription's own timezone, not the server's", () => {
    // 11pm Eastern is 8pm Pacific -- not overnight for a Pacific subscriber.
    const now = DateTime.fromObject(
      { hour: 23, minute: 0 },
      { zone: "America/New_York" },
    );
    expect(calculatePushDelayMs("America/Los_Angeles", now)).toBe(0);
  });
});
