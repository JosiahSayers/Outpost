import express, { Router } from "express";

// Proxies the frontend Sentry SDK's envelope requests through our own
// origin instead of posting directly to ingest.sentry.io. Browser
// content-blockers and Safari's cross-site tracking prevention (both
// especially aggressive on iOS) commonly block direct requests to Sentry's
// domain, silently dropping error/replay reports client-side. Routing
// through our own domain makes the request indistinguishable from any
// other same-origin API call.
//
// The DSN travels inside the envelope itself (its first line is a JSON
// header), not as a route param, so this only needs to know which ingest
// hosts it's willing to forward to.
const ALLOWED_INGEST_HOSTS = new Set(["o1160609.ingest.us.sentry.io"]);

export const sentryTunnelRouter = Router();

sentryTunnelRouter.post(
  "/",
  // Raw bytes, not text: a Replay envelope carries its recording data as a
  // gzip-compressed binary item alongside the plain-JSON headers. Decoding
  // the body as a UTF-8 string (the previous `express.text()` parser)
  // silently mangles that binary item -- any byte sequence that isn't valid
  // UTF-8 gets replaced with U+FFFD -- so replays never made it to Sentry
  // even though ordinary (all-JSON) error envelopes passed through fine.
  express.raw({ type: () => true, limit: "5mb" }),
  async (req, res) => {
    const envelope = req.body as Buffer;
    if (!Buffer.isBuffer(envelope) || envelope.length === 0) {
      res.sendStatus(400);
      return;
    }

    const headerEnd = envelope.indexOf("\n");
    const headerLine = envelope.subarray(
      0,
      headerEnd === -1 ? envelope.length : headerEnd,
    );

    let dsn: URL;
    try {
      const header = JSON.parse(headerLine.toString("utf-8")) as {
        dsn?: string;
      };
      dsn = new URL(header.dsn ?? "");
    } catch {
      res.sendStatus(400);
      return;
    }

    if (!ALLOWED_INGEST_HOSTS.has(dsn.hostname)) {
      res.sendStatus(400);
      return;
    }

    const projectId = dsn.pathname.replace("/", "");
    const upstream = await fetch(
      `https://${dsn.hostname}/api/${projectId}/envelope/`,
      {
        method: "POST",
        body: new Uint8Array(envelope),
        headers: { "Content-Type": "application/x-sentry-envelope" },
      },
    );

    res.sendStatus(upstream.status);
  },
);
