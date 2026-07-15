import winston, { type transport } from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: getFormat(),
  defaultMeta: await getDefaultMeta(),
  exitOnError: false,
  transports: getTransports("application"),
  silent: Bun.env.NODE_ENV === "test",
});

export const jobLogger = winston.createLogger({
  level: "info",
  format: getFormat(),
  defaultMeta: await getDefaultMeta(),
  exitOnError: false,
  transports: getTransports("job"),
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

function getTransports(loggerName: string) {
  const transports: transport[] = [];

  if (Bun.env.SKIP_LOG_WRITE !== "true") {
    //
    // - Write all logs with importance level of `error` or higher to `error.log`
    //   (i.e., error, fatal, but not other levels)
    //
    transports.push(
      new winston.transports.File({
        filename: `${Bun.env.LOG_FOLDER}/${loggerName}.error.log`,
        level: "error",
        handleExceptions: true,
      }),
    );
    //
    // - Write all logs with importance level of `info` or higher to `combined.log`
    //   (i.e., fatal, error, warn, and info, but not trace)
    //
    transports.push(
      new winston.transports.File({
        filename: `${Bun.env.LOG_FOLDER}/${loggerName}.combined.log`,
      }),
    );
  }

  if (Bun.env.NODE_ENV !== "production") {
    transports.push(
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    );
  }

  return transports;
}
