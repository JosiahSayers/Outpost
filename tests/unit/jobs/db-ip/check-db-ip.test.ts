import { checkDbIp } from "$/jobs/workers/db-ip/check-db-ip";
import { dbIpDownloadQueue } from "$/jobs/workers/db-ip/download-db-ip";
import { localCityFile } from "$/jobs/workers/db-ip/shared";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import type { Job } from "bullmq";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fakeJob(): Job {
  return { name: "check-db-ip", data: {}, id: "check-job-1" } as unknown as Job;
}

// checkDbIp computes "now" internally rather than taking it as a parameter,
// so tests mirror its year/month formatting instead of injecting a fixed date.
function currentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const monthWithOffset = now.getMonth() + 1;
  const month =
    monthWithOffset < 10 ? `0${monthWithOffset}` : String(monthWithOffset);
  return { year, month };
}

describe("checkDbIp", () => {
  const originalDir = Bun.env.DB_IP_DIR;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "db-ip-check-"));
    Bun.env.DB_IP_DIR = dir;
  });

  afterEach(async () => {
    Bun.env.DB_IP_DIR = originalDir;
    await rm(dir, { recursive: true, force: true });
    mock.restore();
  });

  it("skips the download when the current month's file already exists locally", async () => {
    const { year, month } = currentYearMonth();
    await Bun.write(join(dir, localCityFile(year, month)), "existing-file");
    const addSpy = spyOn(dbIpDownloadQueue, "add");

    const result = await checkDbIp(fakeJob());

    expect(result).toBe("Current file found, skipping download");
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("enqueues a download job with the current year/month when the local file is missing", async () => {
    const { year, month } = currentYearMonth();
    const addSpy = spyOn(dbIpDownloadQueue, "add").mockResolvedValue({
      id: "download-job-42",
    } as any);

    const result = await checkDbIp(fakeJob());

    expect(addSpy).toHaveBeenCalledWith("download-db-ip", { year, month });
    expect(result).toBe(
      "Current local file not found, created download job with id download-job-42",
    );
  });

  it("does not enqueue when a file for the current month exists alongside unrelated files", async () => {
    const { year, month } = currentYearMonth();
    await Bun.write(join(dir, localCityFile(year, month)), "existing-file");
    await Bun.write(join(dir, "some-other-file.txt"), "noise");
    const addSpy = spyOn(dbIpDownloadQueue, "add");

    await checkDbIp(fakeJob());

    expect(addSpy).not.toHaveBeenCalled();
  });
});
