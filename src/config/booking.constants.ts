/** Time allowed to pay after admin approval (15 minutes). */
export const PAYMENT_DEADLINE_MS = 15 * 60 * 1000

/**
 * Default deposit amount in the local currency unit (e.g. THB).
 * In the future this may be driven by country config.
 */
export const DEPOSIT_AMOUNT_DEFAULT = 5000

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
