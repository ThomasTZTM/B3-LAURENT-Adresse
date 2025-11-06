import pino from "pino";

const dest = process.env.LOG_FILE || "logs/app.log";

export const logger = pino(
  { level: process.env.LOG_LEVEL || "info" },
  pino.transport({
    target: "pino/file",
    options: { destination: dest, mkdir: true }
  })
);
