import {
  downloadDbIp,
  type DownloadDbIpData,
} from "$/jobs/workers/db-ip/download-db-ip";
import { downloadUrl } from "$/jobs/workers/db-ip/shared";
import { localCityFile } from "$/utils/ip-lookup";
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
import maxmind from "maxmind";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YEAR = 2026;
const MONTH = "08";

function fakeJob(): Job<DownloadDbIpData> {
  const job: any = {
    name: "download-db-ip",
    id: "download-job-1",
    data: { year: YEAR, month: MONTH },
    progress: {},
  };
  // Mirrors real BullMQ behavior (job.progress reflects the last
  // updateProgress call), since reportProgress reads job.progress back to
  // merge in each new stage's timing.
  job.updateProgress = mock(async (value: unknown) => {
    job.progress = value;
  });
  return job as Job<DownloadDbIpData>;
}

function gzippedFixture(content = "fake-mmdb-bytes") {
  return Bun.gzipSync(Buffer.from(content));
}

// Not a real fetch Response -- happy-dom (registered globally in
// tests/preload.ts) shadows the native Response class with one that lacks
// .bytes(), and downloadDbIp only ever calls .bytes() on the result.
function fakeFetchResponse() {
  return { bytes: async () => gzippedFixture() };
}

describe("downloadDbIp", () => {
  const originalDir = Bun.env.DB_IP_DIR;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "db-ip-download-"));
    Bun.env.DB_IP_DIR = dir;
  });

  afterEach(async () => {
    Bun.env.DB_IP_DIR = originalDir;
    await rm(dir, { recursive: true, force: true });
    mock.restore();
  });

  it("downloads, decompresses, verifies, and writes the file", async () => {
    const fetchImpl = mock(async () => fakeFetchResponse());
    spyOn(maxmind, "open").mockResolvedValue({
      get: (ip: string) => (ip === "1.1.1.1" ? { country: "AU" } : null),
    } as any);
    const job = fakeJob();

    const result = await downloadDbIp(
      job,
      fetchImpl as unknown as typeof fetch,
    );

    const expectedPath = join(dir, localCityFile(YEAR, MONTH));
    expect(fetchImpl).toHaveBeenCalledWith(downloadUrl(YEAR, MONTH));
    expect(result).toEqual({ newFile: expectedPath, cleanedFiles: [] });
    expect(await Bun.file(expectedPath).text()).toBe("fake-mmdb-bytes");
  });

  it("reports progress for each stage of the job", async () => {
    const fetchImpl = mock(async () => fakeFetchResponse());
    spyOn(maxmind, "open").mockResolvedValue({
      get: () => ({ country: "AU" }),
    } as any);
    const job = fakeJob();

    await downloadDbIp(job, fetchImpl as unknown as typeof fetch);

    const reportedKeys = (
      job.updateProgress as ReturnType<typeof mock>
    ).mock.calls.map((call: any[]) => Object.keys(call[0]));
    expect(reportedKeys).toEqual([
      ["downloadTime"],
      ["downloadTime", "decompressionTime"],
      ["downloadTime", "decompressionTime", "writeTime"],
      [
        "downloadTime",
        "decompressionTime",
        "writeTime",
        "verificationTime",
        "verificationPassed",
      ],
      [
        "downloadTime",
        "decompressionTime",
        "writeTime",
        "verificationTime",
        "verificationPassed",
        "cleanupTime",
      ],
    ]);
    const lastCall = (
      job.updateProgress as ReturnType<typeof mock>
    ).mock.calls.at(-1)![0];
    expect(lastCall.verificationPassed).toBe(true);
  });

  it("deletes other files in DB_IP_DIR and reports them as cleaned up", async () => {
    const fetchImpl = mock(async () => fakeFetchResponse());
    spyOn(maxmind, "open").mockResolvedValue({
      get: () => ({ country: "AU" }),
    } as any);
    await Bun.write(join(dir, "dbip-city-lite-2026-07.mmdb"), "stale");
    await Bun.write(join(dir, "unrelated.txt"), "noise");

    const result = await downloadDbIp(
      fakeJob(),
      fetchImpl as unknown as typeof fetch,
    );

    expect(result.cleanedFiles.sort()).toEqual(
      ["dbip-city-lite-2026-07.mmdb", "unrelated.txt"].sort(),
    );
    const remaining = await readdir(dir);
    expect(remaining).toEqual([localCityFile(YEAR, MONTH)]);
  });

  it("deletes the downloaded file and throws when verification fails", async () => {
    const fetchImpl = mock(async () => fakeFetchResponse());
    spyOn(maxmind, "open").mockResolvedValue({
      get: () => null,
    } as any);

    await expect(
      downloadDbIp(fakeJob(), fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/Failed to download and verify new db-ip file/);

    const expectedPath = join(dir, localCityFile(YEAR, MONTH));
    expect(await Bun.file(expectedPath).exists()).toBe(false);
  });
});
