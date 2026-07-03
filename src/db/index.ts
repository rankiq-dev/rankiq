import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import { logger } from "@/infra/logger"

/* Prefer POSTGRES_URL (Neon integration) over DATABASE_URL if both exist */
const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is required — cannot connect to database")
}

/* Neon and other hosted Postgres require SSL in production.
   postgres.js doesn't parse sslmode from the URL — pass it explicitly. */
const isProduction = process.env.NODE_ENV === "production"
const needsSsl = isProduction || connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: needsSsl ? "require" : undefined,
  onnotice: (notice) => logger.debug({ notice }, "Postgres notice"),
})

export const db = drizzle(client, { schema, logger: false })
export type DB = typeof db
