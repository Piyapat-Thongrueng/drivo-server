/** Time allowed to pay after admin approval (15 minutes). */
export const PAYMENT_DEADLINE_MS = 15 * 60 * 1000

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
