import { fetchOpenGraph } from "$/utils/open-graph";
import { describe, expect, it, mock } from "bun:test";

function mockFetch(response: string) {
  return mock(async (_url: string, _init?: RequestInit) => ({
    text: async () => response,
  }));
}

const asFetch = (fn: ReturnType<typeof mockFetch>) =>
  fn as unknown as typeof fetch;

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
    const fetchImpl = mockFetch(html);

    const result = await fetchOpenGraph(
      "https://example.com",
      asFetch(fetchImpl),
    );

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
    const fetchImpl = mockFetch(html);

    const result = await fetchOpenGraph(
      "https://example.com",
      asFetch(fetchImpl),
    );

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
    const fetchImpl = mockFetch("<html><head></head><body>Hello</body></html>");

    const result = await fetchOpenGraph(
      "https://example.com",
      asFetch(fetchImpl),
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

  it("returns all undefined values when the response is an error page", async () => {
    const fetchImpl = mockFetch("<html><body>404 Not Found</body></html>");

    const result = await fetchOpenGraph(
      "https://example.com/missing",
      asFetch(fetchImpl),
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

    await fetchOpenGraph("https://example.com/page", asFetch(fetchImpl));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://example.com/page");
    const headers = options?.headers as Record<string, string> | undefined;
    expect(headers?.["User-Agent"]).toBeTruthy();
  });
});
