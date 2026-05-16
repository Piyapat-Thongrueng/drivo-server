function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/** Stripe secret key — server only. Used in Phase 3+ payment services. */
export function getStripeSecretKey(): string {
  return requireEnv("STRIPE_SECRET_KEY")
}

/** Stripe webhook signing secret — server only. Used for webhook verification. */
export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET")
}
