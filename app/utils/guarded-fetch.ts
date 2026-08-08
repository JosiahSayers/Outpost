import ipaddr from "ipaddr.js";
import { lookup as dnsLookup } from "node:dns/promises";

// Fetching a URL that ultimately comes from outside our control (a user, or a
// third-party page we're scraping) is an SSRF sink: left unguarded it would
// let a caller point our server at internal services (cloud metadata
// endpoints, localhost, RFC1918 hosts, etc). This module is the shared guard
// -- host validation, redirect re-validation, protocol allowlist, and
// bounded time/size -- factored out of app/utils/open-graph.ts so a second
// caller (the public-meal-catalog image importer) doesn't have to
// re-implement the same security-critical logic.
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BYTES = 2_000_000;
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
 * Read at most `limit` bytes of the response body, keeping the leading bytes
 * of an over-limit body rather than discarding it -- while never buffering
 * more than `limit` bytes into memory, so a huge (or malicious) response
 * can't exhaust it.
 */
async function readBytesWithLimit(
  res: Response,
  limit: number,
): Promise<Uint8Array> {
  if (!res.body) {
    // A null body means there is genuinely nothing to read (e.g. 204/304 or a
    // HEAD response). Any response carrying a payload exposes a readable
    // stream, so we never fall back to an unbounded read that would buffer
    // the whole body before we could enforce the limit.
    return new Uint8Array(0);
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
  return merged;
}

export interface GuardedFetchOptions {
  fetchImpl?: typeof fetch;
  lookupImpl?: LookupFn;
  timeoutMs?: number;
  maxBytes?: number;
  // Tested against the response's content-type header; the fetch is rejected
  // (before the body is read) if it doesn't match. Omit to accept any type.
  allowedContentTypes?: RegExp;
  headers?: Record<string, string>;
}

export interface GuardedFetchResult {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * Fetch a URL with SSRF and resource-exhaustion guards: validates the host
 * (and every redirect hop) resolves to a public address, follows redirects
 * manually so each hop is re-checked, and bounds the request by time and size.
 *
 * Note: `fetch` performs its own DNS resolution after our check, leaving a small
 * DNS-rebinding (TOCTOU) window. Closing it fully requires pinning the socket to
 * the validated IP; the intended backstop is an egress network policy that blocks
 * internal ranges.
 */
export async function fetchGuarded(
  initialUrl: string,
  options: GuardedFetchOptions = {},
): Promise<GuardedFetchResult> {
  const {
    fetchImpl = fetch,
    lookupImpl = dnsLookup,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    allowedContentTypes,
    headers,
  } = options;

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
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
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
    if (allowedContentTypes && !allowedContentTypes.test(contentType)) {
      throw new Error(
        `Refusing to process unexpected content type: ${contentType}`,
      );
    }

    const bytes = await readBytesWithLimit(res, maxBytes);
    return { bytes, contentType };
  }

  throw new Error(`Exceeded the maximum of ${MAX_REDIRECTS} redirects`);
}
