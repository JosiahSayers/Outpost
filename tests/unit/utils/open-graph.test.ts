import { fetchOpenGraph } from "$/utils/open-graph";
import { describe, expect, it, mock } from "bun:test";
import type { lookup as dnsLookup } from "node:dns/promises";

function htmlResponse(body: string, init?: ResponseInit) {
  return new Response(body, {
    headers: { "content-type": "text/html" },
    ...init,
  });
}

function mockFetch(response: string, init?: ResponseInit) {
  return mock(async (_url: string, _reqInit?: RequestInit) =>
    htmlResponse(response, init),
  );
}

const asFetch = (fn: ReturnType<typeof mockFetch>) =>
  fn as unknown as typeof fetch;

// Default stub: every host resolves to a public unicast address so the SSRF
// guard lets the fetch through. Tests that exercise the guard override this.
const publicLookup = mock(async () => [
  { address: "93.184.215.14", family: 4 },
]) as unknown as typeof dnsLookup;

const call = (
  url: string,
  fetchImpl: ReturnType<typeof mockFetch>,
  lookupImpl: typeof dnsLookup = publicLookup,
) => fetchOpenGraph(url, { fetchImpl: asFetch(fetchImpl), lookupImpl });

describe("fetchOpenGraph", () => {
  it("extracts all supported Open Graph tags", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="A Great Trip" />
          <meta property="og:description" content="You should go here" />
          <meta property="og:image" content="https://example.com/image.png" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Example" />
          <meta property="og:audio" content="https://example.com/audio.mp3" />
          <meta property="og:video" content="https://example.com/video.mp4" />
        </head>
      </html>
    `;

    const result = await call("https://example.com", mockFetch(html));

    expect(result).toEqual({
      name: "A Great Trip",
      description: "You should go here",
      imageUrl: "https://example.com/image.png",
      type: "website",
      siteName: "Example",
      audioUrl: "https://example.com/audio.mp3",
      videoUrl: "https://example.com/video.mp4",
    });
  });

  it("returns undefined for tags that are missing", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Only a title" />
        </head>
      </html>
    `;

    const result = await call("https://example.com", mockFetch(html));

    expect(result).toEqual({
      name: "Only a title",
      description: undefined,
      imageUrl: undefined,
      type: undefined,
      siteName: undefined,
      audioUrl: undefined,
      videoUrl: undefined,
    });
  });

  it("returns all undefined values when there are no Open Graph tags", async () => {
    const result = await call(
      "https://example.com",
      mockFetch("<html><head></head><body>Hello</body></html>"),
    );

    expect(result).toEqual({
      name: undefined,
      description: undefined,
      imageUrl: undefined,
      type: undefined,
      siteName: undefined,
      audioUrl: undefined,
      videoUrl: undefined,
    });
  });

  it("requests the given url with a User-Agent header", async () => {
    const fetchImpl = mockFetch("<html></html>");

    await call("https://example.com/page", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://example.com/page");
    const headers = options?.headers as Record<string, string> | undefined;
    expect(headers?.["User-Agent"]).toBe(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15",
    );
  });

  describe("SSRF protections", () => {
    it("refuses to fetch a host that resolves to a private address", async () => {
      const fetchImpl = mockFetch("<html></html>");
      const privateLookup = mock(async () => [
        { address: "10.0.0.5", family: 4 },
      ]) as unknown as typeof dnsLookup;

      await expect(
        call("http://internal.example.com", fetchImpl, privateLookup),
      ).rejects.toThrow(/non-public address/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("refuses to fetch a host that resolves to loopback", async () => {
      const fetchImpl = mockFetch("<html></html>");
      const loopbackLookup = mock(async () => [
        { address: "127.0.0.1", family: 4 },
      ]) as unknown as typeof dnsLookup;

      await expect(
        call("http://localhost", fetchImpl, loopbackLookup),
      ).rejects.toThrow(/non-public address/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("refuses to fetch the cloud metadata link-local address", async () => {
      const fetchImpl = mockFetch("<html></html>");
      const metadataLookup = mock(async () => [
        { address: "169.254.169.254", family: 4 },
      ]) as unknown as typeof dnsLookup;

      await expect(
        call("http://metadata.example.com", fetchImpl, metadataLookup),
      ).rejects.toThrow(/non-public address/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("refuses to fetch when any resolved address is non-public", async () => {
      const fetchImpl = mockFetch("<html></html>");
      const mixedLookup = mock(async () => [
        { address: "93.184.215.14", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]) as unknown as typeof dnsLookup;

      await expect(
        call("http://rebind.example.com", fetchImpl, mixedLookup),
      ).rejects.toThrow(/non-public address/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("re-validates the host on each redirect hop", async () => {
      let calls = 0;
      const fetchImpl = mock(async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(null, {
            status: 302,
            headers: { location: "http://internal.example.com/private" },
          });
        }
        return htmlResponse("<html></html>");
      });

      // First hop resolves public, the redirect target resolves private.
      const lookupImpl = mock(async (hostname: string) =>
        hostname === "internal.example.com"
          ? [{ address: "10.0.0.5", family: 4 }]
          : [{ address: "93.184.215.14", family: 4 }],
      ) as unknown as typeof dnsLookup;

      await expect(
        fetchOpenGraph("http://public.example.com", {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          lookupImpl,
        }),
      ).rejects.toThrow(/non-public address/);
      expect(calls).toBe(1);
    });

    it("rejects an unsupported protocol", async () => {
      const fetchImpl = mockFetch("<html></html>");

      await expect(call("ftp://example.com/file", fetchImpl)).rejects.toThrow(
        /unsupported protocol/,
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe("resource-exhaustion protections", () => {
    it("rejects a non-HTML content type", async () => {
      const fetchImpl = mockFetch("not html", {
        headers: { "content-type": "application/pdf" },
      });

      await expect(
        call("https://example.com/file.pdf", fetchImpl),
      ).rejects.toThrow(/non-HTML content type/);
    });

    it("parses the leading bytes when the body exceeds the limit", async () => {
      // OG tags sit in the <head>; a body larger than the cap should still yield
      // them from the leading bytes rather than being discarded.
      const head = `<html><head><meta property="og:title" content="Big Page" /></head><body>`;
      const fetchImpl = mockFetch(head + "x".repeat(2_500_000));

      const result = await call("https://example.com/huge", fetchImpl);

      expect(result.name).toBe("Big Page");
    });

    it("treats a bodyless response as empty rather than reading unbounded", async () => {
      const fetchImpl = mock(
        async () =>
          new Response(null, { headers: { "content-type": "text/html" } }),
      );

      const result = await call(
        "https://example.com/no-body",
        fetchImpl as unknown as ReturnType<typeof mockFetch>,
      );

      expect(result).toEqual({
        name: undefined,
        description: undefined,
        imageUrl: undefined,
        type: undefined,
        siteName: undefined,
        audioUrl: undefined,
        videoUrl: undefined,
      });
    });
  });
});
