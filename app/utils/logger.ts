import winston, { type transport } from "winston";
import TransportStream from "winston-transport";
import * as Sentry from "@sentry/bun";

const SENTRY_LOG_LEVEL_MAP: Record<
  string,
  "trace" | "debug" | "info" | "warn" | "error"
> = {
  silly: "trace",
  debug: "debug",
  verbose: "debug",
  http: "info",
  info: "info",
  warn: "warn",
  error: "error",
};

// Sentry log attributes must be string | number | boolean — flatten anything
// else (nested objects, Error instances) rather than silently dropping it.
function toSentryAttributes(
  meta: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      attributes[key] = value;
    } else if (value instanceof Error) {
      attributes[key] = value.stack ?? value.message;
    } else if (value !== undefined && value !== null) {
      attributes[key] = JSON.stringify(value);
    }
  }
  return attributes;
}

class SentryTransport extends TransportStream {
  override log(info: Record<string, unknown>, callback: () => void) {
    const { level, message, timestamp, ...meta } = info;
    const fn = SENTRY_LOG_LEVEL_MAP[level as string] ?? "info";
    Sentry.logger[fn](String(message), toSentryAttributes(meta));
    callback();
  }
}

// winston.format.errors({ stack: true }) only rewrites `info` when the log
// call's top-level argument *is* an Error. Errors passed as metadata fields
// (e.g. `logger.warn(msg, { error: err })`) pass through untouched, and
// Error's own properties (message, stack) are non-enumerable, so
// format.json() serializes them to `{}`. Flatten any Error found in metadata
// before it reaches json().
const serializeErrorMeta = winston.format((info) => {
  for (const key of Object.keys(info)) {
    const value = info[key];
    if (value instanceof Error) {
      info[key] = {
        ...value,
        message: value.message,
        name: value.name,
        stack: value.stack,
      };
    }
  }
  return info;
});

export const logger = winston.createLogger({
  level: "info",
  format: getFormat(),
  defaultMeta: await getDefaultMeta(),
  exitOnError: false,
  transports: getTransports(),
  silent: Bun.env.NODE_ENV === "test",
});

export const jobLogger = winston.createLogger({
  level: "info",
  format: getFormat(),
  defaultMeta: await getDefaultMeta(),
  exitOnError: false,
  transports: getTransports(),
  silent: Bun.env.NODE_ENV === "test",
});

function getFormat() {
  return winston.format.combine(
    winston.format.errors({ stack: true }),
    serializeErrorMeta(),
    winston.format.timestamp(),
    winston.format.json(),
  );
}

async function getDefaultMeta() {
  return { version: (await Bun.file("./version").text())?.trim() };
}

function getTransports() {
  const transports: transport[] = [];

  // Logs are always written to stdout/stderr, never to disk. In production,
  // Docker's logging driver handles rotation (see `logging:` in
  // docker-compose.staging.yml).
  transports.push(
    new winston.transports.Console({
      format:
        Bun.env.NODE_ENV === "production" ? undefined : winston.format.simple(),
      handleExceptions: true,
    }),
  );

  transports.push(new SentryTransport());

  return transports;
}
