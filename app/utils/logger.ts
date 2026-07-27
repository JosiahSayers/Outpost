import winston, { type transport } from "winston";

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

  return transports;
}
