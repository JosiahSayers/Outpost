import { faker } from "@faker-js/faker";
import * as cheerio from "cheerio";
import ipaddr from "ipaddr.js";
import { lookup as dnsLookup } from "node:dns/promises";
import type { TripLink } from "../../generated/prisma/client";

const LINK_TO_OG: Record<
  keyof Omit<TripLink, "id" | "createdAt" | "updatedAt" | "tripId" | "url">,
  string
> = {
  name: "og:title",
  description: "og:description",
  imageUrl: "og:image",
  type: "og:type",
  siteName: "og:site_name",
  audioUrl: "og:audio",
  videoUrl: "og:video",
};

// The URL passed here is user-provided, so this function is an SSRF sink: left
// unguarded it would let a caller point our server at internal services (cloud
// metadata endpoints, localhost, RFC1918 hosts, etc). The constants and checks
// below keep the fetch narrow — public HTTP(S) hosts only, bounded time/size.
const FETCH_TIMEOUT_MS = 5_000;
// 2 MB comfortably covers a page's <head> (where OG tags live); larger bodies
// are truncated to this and the leading bytes are parsed. See readBodyWithLimit.
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
// ipaddr.js labels every non-public range (loopback, private, linkLocal,
// uniqueLocal, reserved, unspecified, broadcast, carrierGradeNat, …). We
// allowlist the one range that is safe to reach rather than trying to
// enumerate everything that isn't.
const PUBLIC_RANGE = "unicast";

type LookupFn = typeof dnsLookup;

/**
 * Resolve `hostname` and throw if it maps to any non-public address. Guards
 * against a URL (or a redirect target) that points at internal infrastructure.
 */
async function assertHostIsPublic(hostname: string, lookupImpl: LookupFn) {
  // `all: true` so a host resolving to several records can't slip a private
  // address past us by ordering a public one first.
  const results = await lookupImpl(hostname, { all: true });

  if (results.length === 0) {
    throw new Error(`Refusing to fetch ${hostname}: no DNS results`);
  }

  for (const { address } of results) {
    let parsed: ReturnType<typeof ipaddr.process>;
    try {
      parsed = ipaddr.process(address);
    } catch {
      throw new Error(`Refusing to fetch ${hostname}: unparseable address`);
    }

    if (parsed.range() !== PUBLIC_RANGE) {
      throw new Error(
        `Refusing to fetch ${hostname}: resolves to non-public address ${address}`,
      );
    }
  }
}

/**
 * Read at most `limit` bytes of the response body. Open Graph tags live in the
 * document <head>, so if a page is larger than the limit we keep the leading
 * bytes and parse those rather than discarding the page — while never buffering
 * more than `limit` bytes into memory, so a huge (or malicious) response can't
 * exhaust it.
 */
async function readBodyWithLimit(res: Response, limit: number) {
  if (!res.body) {
    // A null body means there is genuinely nothing to read (e.g. 204/304 or a
    // HEAD response). Any response carrying a payload exposes a readable stream,
    // so we never fall back to an unbounded `res.text()` that would buffer the
    // whole body before we could enforce the limit.
    return "";
  }

  const chunks: Array<Uint8Array> = [];
  let total = 0;
  // Iterating the stream (rather than a manual read() loop) lets breaking out
  // cancel the underlying reader for us via the async iterator's cleanup. The
  // DOM lib doesn't type ReadableStream as async-iterable, but Bun supports it.
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    const remaining = limit - total;
    if (chunk.byteLength >= remaining) {
      // This chunk reaches the cap: keep just enough to fill it, then stop.
      chunks.push(chunk.subarray(0, remaining));
      total += remaining;
      break;
    }
    chunks.push(chunk);
    total += chunk.byteLength;
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Fetch a URL as HTML with SSRF and resource-exhaustion guards: validates the
 * host (and every redirect hop) resolves to a public address, follows redirects
 * manually so each hop is re-checked, and bounds the request by time and size.
 *
 * Note: `fetch` performs its own DNS resolution after our check, leaving a small
 * DNS-rebinding (TOCTOU) window. Closing it fully requires pinning the socket to
 * the validated IP; the intended backstop is an egress network policy that blocks
 * internal ranges. See recommendations in the PR discussion.
 */
async function fetchHtml(
  initialUrl: string,
  fetchImpl: typeof fetch,
  lookupImpl: LookupFn,
) {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(currentUrl);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new Error(
        `Refusing to fetch unsupported protocol ${parsed.protocol}`,
      );
    }

    await assertHostIsPublic(parsed.hostname, lookupImpl);

    const res = await fetchImpl(currentUrl, {
      headers: { "User-Agent": faker.internet.userAgent() },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    // Follow redirects ourselves so the destination host is re-validated
    // instead of letting `fetch` transparently chase a 3xx to an internal host.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error("Redirect response missing a Location header");
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!/\b(text\/html|application\/xhtml\+xml)\b/i.test(contentType)) {
      throw new Error(
        `Refusing to parse non-HTML content type: ${contentType}`,
      );
    }

    return await readBodyWithLimit(res, MAX_RESPONSE_BYTES);
  }

  throw new Error(`Exceeded the maximum of ${MAX_REDIRECTS} redirects`);
}

export async function fetchOpenGraph(
  url: string,
  {
    fetchImpl = fetch,
    lookupImpl = dnsLookup,
  }: { fetchImpl?: typeof fetch; lookupImpl?: LookupFn } = {},
) {
  const text = await fetchHtml(url, fetchImpl, lookupImpl);

  const $ = cheerio.load(text);

  return Object.fromEntries(
    Object.entries(LINK_TO_OG).map(([key, selector]) => [
      key,
      $(`meta[property="${selector}"]`).attr("content"),
    ]),
  );
}
