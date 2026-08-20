import { sentryTunnelRouter } from "$/routers/sentry-tunnel";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import express from "express";
import request from "supertest";
import { gzipSync } from "node:zlib";

const ALLOWED_HOST = "o1160609.ingest.us.sentry.io";

function buildTestApp() {
  const testApp = express();
  testApp.use("/", sentryTunnelRouter);
  return testApp;
}

function buildEnvelope(dsn: string, itemPayload: Buffer) {
  const header = Buffer.from(JSON.stringify({ dsn }) + "\n");
  const itemHeader = Buffer.from(
    JSON.stringify({ type: "replay_recording", length: itemPayload.length }) +
      "\n",
  );
  return Buffer.concat([header, itemHeader, itemPayload, Buffer.from("\n")]);
}

function mockFetch(status: number) {
  return spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status }),
  );
}

afterEach(() => {
  mock.restore();
});

describe("sentryTunnelRouter", () => {
  it("forwards the envelope's raw bytes unmodified, including a binary (gzip) item", async () => {
    const dsn = `https://public@${ALLOWED_HOST}/123`;
    const compressed = gzipSync(Buffer.from("some replay recording data"));
    const envelope = buildEnvelope(dsn, compressed);
    const fetchSpy = mockFetch(200);

    await request(buildTestApp())
      .post("/")
      .set("Content-Type", "application/x-sentry-envelope")
      .send(envelope)
      .expect(200);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(`https://${ALLOWED_HOST}/api/123/envelope/`);
    expect(options?.method).toBe("POST");
    expect(options?.headers).toEqual({
      "Content-Type": "application/x-sentry-envelope",
    });

    // The regression this guards against: routing the body through a UTF-8
    // string (rather than forwarding raw bytes) corrupts non-UTF-8-safe
    // bytes like a gzip stream, so assert byte-for-byte equality rather than
    // just "truthy body".
    expect(Buffer.compare(options!.body as Uint8Array, envelope)).toBe(0);
  });

  it("proxies the upstream response status back to the client", async () => {
    const dsn = `https://public@${ALLOWED_HOST}/123`;
    const envelope = buildEnvelope(dsn, Buffer.from("x"));
    mockFetch(429);

    await request(buildTestApp())
      .post("/")
      .set("Content-Type", "application/x-sentry-envelope")
      .send(envelope)
      .expect(429);
  });

  it("rejects an empty body without calling fetch", async () => {
    const fetchSpy = mockFetch(200);

    await request(buildTestApp())
      .post("/")
      .set("Content-Type", "application/x-sentry-envelope")
      .send(Buffer.alloc(0))
      .expect(400);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a body whose header line isn't valid JSON", async () => {
    const fetchSpy = mockFetch(200);

    await request(buildTestApp())
      .post("/")
      .set("Content-Type", "application/x-sentry-envelope")
      .send(Buffer.from("not json\n{}\n"))
      .expect(400);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a DSN host that isn't on the allowlist", async () => {
    const dsn = "https://public@evil.example.com/123";
    const envelope = buildEnvelope(dsn, Buffer.from("x"));
    const fetchSpy = mockFetch(200);

    await request(buildTestApp())
      .post("/")
      .set("Content-Type", "application/x-sentry-envelope")
      .send(envelope)
      .expect(400);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
