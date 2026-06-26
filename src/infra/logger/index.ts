import pino from "pino"

const isDev = process.env.NODE_ENV !== "production"

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: { service: "rankiq" },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label }
      },
    },
    redact: {
      paths: [
        "*.password",
        "*.secret",
        "*.token",
        "*.apiKey",
        "*.api_key",
        "*.authorization",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
  },
  isDev ? pino.transport({ target: "pino-pretty", options: { colorize: true } }) : undefined
)

export type Logger = typeof logger
