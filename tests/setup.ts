/* Set required env vars before any module imports so config loader doesn't throw */
process.env.DATABASE_URL         = "postgresql://rankiq:testpassword@localhost:5432/rankiq_test"
process.env.NEXTAUTH_SECRET      = "test-secret-at-least-32-chars-long-ok"
process.env.NEXTAUTH_URL         = "http://localhost:3000"
process.env.GOOGLE_CLIENT_ID     = "test-google-client-id"
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret"
process.env.ANTHROPIC_API_KEY    = "test-anthropic-key"
process.env.REDIS_URL            = "redis://localhost:6379"
process.env.STRIPE_SECRET_KEY    = "sk_test_placeholder"
process.env.STRIPE_WEBHOOK_SECRET= "whsec_test_placeholder"
process.env.RESEND_API_KEY       = "re_test_placeholder"
/* NODE_ENV is already set to "test" by vitest — no override needed */
