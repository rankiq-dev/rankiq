import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import { logger } from "@/infra/logger"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — cannot connect to database")
}

const client = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: (notice) => logger.debug({ notice }, "Postgres notice"),
})

export const db = drizzle(client, { schema, logger: false })
export type DB = typeof db
