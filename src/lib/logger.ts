/**
 * Simple level-based logger. In development logs all levels; in production
 * only warn and error (or respect LOG_LEVEL). No external service.
 */
const PREFIX = "[Card Pilot]";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "debug" || env === "info" || env === "warn" || env === "error") return env;
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

const minLevel = getMinLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function format(message: string, ...args: unknown[]): [string, ...unknown[]] {
  return [`${PREFIX} ${message}`, ...args];
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog("debug")) console.debug(...format(message, ...args));
  },
  info(message: string, ...args: unknown[]): void {
    if (shouldLog("info")) console.info(...format(message, ...args));
  },
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog("warn")) console.warn(...format(message, ...args));
  },
  error(message: string, ...args: unknown[]): void {
    if (shouldLog("error")) console.error(...format(message, ...args));
  },
};
