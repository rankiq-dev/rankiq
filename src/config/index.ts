import { z } from "zod"

/* Secrets that look like placeholders — boot refuses if any secret matches.
   Checks: exact match OR starts-with one of these prefixes (covers padded variants). */
const PLACEHOLDER_PATTERN =
  /^(changeme|placeholder|replace.?me|your.?secret|todo|example|test.?secret|insert.?here|add.?here|put.?here|fixme|secret|dummy|fake)/i

function refuseIfConstant(name: string, value: string) {
  if (PLACEHOLDER_PATTERN.test(value.trim())) {
    throw new Error(
      `Security boot guard: ${name} looks like a placeholder ("${value.slice(0, 24)}…"). ` +
        `Set a real secret before starting the app.`
    )
  }
}

const configSchema = z.object({
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),

  nextauthSecret: z.string().min(32, "NEXTAUTH_SECRET must be ≥32 chars"),
  nextauthUrl: z.string().url("NEXTAUTH_URL must be a valid URL"),

  googleClientId: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  googleClientSecret: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  anthropicApiKey: z.string().min(1, "ANTHROPIC_API_KEY is required"),

  langsmithApiKey: z.string().optional(),
  langsmithProject: z.string().default("rankiq-dev"),

  redisUrl: z.string().min(1, "REDIS_URL is required"),

  stripeSecretKey: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  stripeWebhookSecret: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  stripeStarterPriceId: z.string().default(""),
  stripeGrowthPriceId:  z.string().default(""),
  stripeAgencyPriceId:  z.string().default(""),

  resendApiKey: z.string().min(1, "RESEND_API_KEY is required"),
  emailFrom: z.string().email().default("hello@rankiq.com"),

  appUrl: z.string().url().default("http://localhost:3000"),
  nodeEnv: z
    .enum(["development", "test", "production"])
    .default("development"),
})

function loadConfig() {
  const raw = {
    databaseUrl:         process.env.DATABASE_URL,
    nextauthSecret:      process.env.NEXTAUTH_SECRET,
    nextauthUrl:         process.env.NEXTAUTH_URL,
    googleClientId:      process.env.GOOGLE_CLIENT_ID,
    googleClientSecret:  process.env.GOOGLE_CLIENT_SECRET,
    anthropicApiKey:     process.env.ANTHROPIC_API_KEY,
    langsmithApiKey:     process.env.LANGSMITH_API_KEY,
    langsmithProject:    process.env.LANGSMITH_PROJECT,
    redisUrl:            process.env.REDIS_URL,
    stripeSecretKey:      process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret:  process.env.STRIPE_WEBHOOK_SECRET,
    stripeStarterPriceId: process.env.STRIPE_STARTER_PRICE_ID,
    stripeGrowthPriceId:  process.env.STRIPE_GROWTH_PRICE_ID,
    stripeAgencyPriceId:  process.env.STRIPE_AGENCY_PRICE_ID,
    resendApiKey:        process.env.RESEND_API_KEY,
    emailFrom:           process.env.EMAIL_FROM,
    appUrl:              process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv:             process.env.NODE_ENV,
  }

  const result = configSchema.safeParse(raw)

  if (!result.success) {
    const problems = result.error.issues.map((i) => `  • ${i.message}`).join("\n")
    throw new Error(`Config validation failed — refusing to start:\n${problems}`)
  }

  const cfg = result.data

  /* Fail-closed: reject known placeholder secrets in any env */
  if (cfg.nodeEnv !== "test") {
    refuseIfConstant("NEXTAUTH_SECRET",      cfg.nextauthSecret)
    refuseIfConstant("ANTHROPIC_API_KEY",    cfg.anthropicApiKey)
    refuseIfConstant("STRIPE_SECRET_KEY",    cfg.stripeSecretKey)
    refuseIfConstant("STRIPE_WEBHOOK_SECRET",cfg.stripeWebhookSecret)
  }

  return cfg
}

export const config = loadConfig()
export type Config = typeof config
