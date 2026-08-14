import {
  currentLocalCityFile,
  localCityFile,
  localCityFileDate,
  lookupIp,
} from "$/utils/ip-lookup";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import type { CityResponse } from "maxmind";
import maxmind from "maxmind";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("localCityFile", () => {
  it("formats the filename from a year and month", () => {
    expect(localCityFile(2026, "08")).toBe("dbip-city-lite-2026-08.mmdb");
  });
});

describe("localCityFileDate", () => {
  it("returns the current year and zero-padded month", () => {
    const now = new Date();
    const monthWithOffset = now.getMonth() + 1;
    const expectedMonth =
      monthWithOffset < 10 ? `0${monthWithOffset}` : monthWithOffset;

    expect(localCityFileDate()).toEqual({
      year: now.getFullYear(),
      month: expectedMonth,
    });
  });
});

describe("currentLocalCityFile", () => {
  it("combines localCityFileDate and localCityFile", () => {
    const { year, month } = localCityFileDate();

    expect(currentLocalCityFile()).toBe(localCityFile(year, month));
  });
});

describe("lookupIp", () => {
  const originalDir = Bun.env.DB_IP_DIR;
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "ip-lookup-"));
    Bun.env.DB_IP_DIR = dir;
  });

  afterEach(() => {
    mock.restore();
  });

  afterAll(async () => {
    Bun.env.DB_IP_DIR = originalDir;
    await rm(dir, { recursive: true, force: true });
  });

  // lookupIp caches its opened maxmind reader in a module-level variable with
  // no reset hook: once it successfully opens a db file it never checks disk
  // again. These tests are written in the order that behavior actually
  // unfolds -- no file yet, then the file appears, then the cache is reused
  // -- rather than as independent cases, since there's no way to reset the
  // module between them.
  it("returns null when no local db file exists for the current month", async () => {
    const openSpy = spyOn(maxmind, "open");

    const result = await lookupIp("1.1.1.1");

    expect(result).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("opens and caches the local db file once it exists, returning the lookup result", async () => {
    await Bun.write(join(dir, currentLocalCityFile()), "fake-mmdb-bytes");
    const fakeReader = {
      get: mock((ip: string) =>
        ip === "1.1.1.1"
          ? ({ country: "AU" } as unknown as CityResponse)
          : null,
      ),
    };
    const openSpy = spyOn(maxmind, "open").mockResolvedValue(fakeReader as any);

    const result = await lookupIp("1.1.1.1");

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ country: "AU" });
  });

  it("reuses the cached db instance for later lookups instead of reopening the file", async () => {
    const openSpy = spyOn(maxmind, "open");

    const result = await lookupIp("8.8.8.8");

    expect(openSpy).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
