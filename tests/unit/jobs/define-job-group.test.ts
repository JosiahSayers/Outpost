import { createGroupDispatcher } from "$/jobs/define-job-group";
import { describe, expect, it, mock } from "bun:test";
import type { Job } from "bullmq";

function fakeJob(name: string): Job {
  return { name } as unknown as Job;
}

describe("createGroupDispatcher", () => {
  it("routes a job to the processor registered under its name", async () => {
    const peakRefuelProcessor = mock(async () => "peak-refuel-result");
    const mountainHouseProcessor = mock(async () => "mountain-house-result");
    const dispatch = createGroupDispatcher("public_meal_catalog__import", [
      { name: "peak_refuel", processor: peakRefuelProcessor },
      { name: "mountain_house", processor: mountainHouseProcessor },
    ]);

    const result = await dispatch(fakeJob("mountain_house"), "token");

    expect(result).toBe("mountain-house-result");
    expect(mountainHouseProcessor).toHaveBeenCalledTimes(1);
    expect(peakRefuelProcessor).not.toHaveBeenCalled();
  });

  it("throws for a job name with no registered processor", () => {
    const dispatch = createGroupDispatcher("public_meal_catalog__import", [
      { name: "peak_refuel", processor: mock(async () => {}) },
    ]);

    expect(() => dispatch(fakeJob("unknown_vendor"), "token")).toThrow(
      /No processor registered for job "unknown_vendor"/,
    );
  });
});
