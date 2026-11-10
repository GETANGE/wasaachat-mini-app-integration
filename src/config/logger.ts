import { mkdirSync } from "node:fs";
import winston from "winston";

mkdirSync("logs", { recursive: true });

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
);

const lineFormat = winston.format.printf((info) => {
  const { timestamp, level, message, stack, ...meta } = info;
  const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  const trace = stack ? `\n${stack}` : "";
  return `${timestamp} ${level}: ${message}${extra}${trace}`;
});

const stripAnsi = winston.format((info) => {
  if (typeof info.message === "string") {
    info.message = info.message.replace(/\u001b\[[0-9;]*m/g, "");
  }
  return info;
});

const fileFormat = isProd
  ? winston.format.combine(baseFormat, winston.format.json())
  : winston.format.combine(stripAnsi(), baseFormat, lineFormat);

const consoleFormat = isProd
  ? winston.format.combine(baseFormat, winston.format.json())
  : winston.format.combine(baseFormat, winston.format.colorize(), lineFormat);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  defaultMeta: { service: "shop-api" },
  transports: [
    new winston.transports.Console({ silent: isTest, format: consoleFormat }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      silent: isTest,
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: "logs/app.log",
      silent: isTest,
      format: fileFormat,
    }),
  ],
});
