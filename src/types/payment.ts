import { paymentKind, paymentStatus } from "../db/schema"

export type PaymentKind = (typeof paymentKind.enumValues)[number]

export type PaymentStatus = (typeof paymentStatus.enumValues)[number]

export interface Payment {
  id: number
  bookingId: number
  paymentType: PaymentKind
  stripePaymentIntentId: string | null
  stripeCheckoutSessionId: string | null
  amount: string
  currencyCode: string
  status: PaymentStatus
  paidAt: string | null
  idempotencyKey: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
