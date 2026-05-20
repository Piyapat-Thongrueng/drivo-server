/**
 * Time allowed to pay after admin approval (35 minutes).
 * Must be > 30 min because Stripe requires `expires_at` to be
 * at least 30 minutes after Checkout Session creation.
 * Using 35 min gives a 5-minute buffer for network latency.
 */
export const PAYMENT_DEADLINE_MS = 35 * 60 * 1000

/**
 * Fallback deposit when country.default_deposit_amount is missing or invalid.
 * Normal flow uses per-country values from the database (Phase 2.5).
 */
export const DEPOSIT_AMOUNT_FALLBACK = 5000

/** @deprecated Use countries.default_deposit_amount — kept for tests/backward refs */
export const DEPOSIT_AMOUNT_DEFAULT = DEPOSIT_AMOUNT_FALLBACK

/**
 * Booking statuses that block car availability (overlap queries).
 * Includes post-approval states to prevent double-booking while awaiting payment.
 */
export const AVAILABILITY_BLOCKING_STATUSES = [
  "approved",
  "pending_payment",
  "confirmed",
  "active",
] as const

export type AvailabilityBlockingStatus =
  (typeof AVAILABILITY_BLOCKING_STATUSES)[number]
