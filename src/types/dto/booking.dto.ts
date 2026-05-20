import { z } from "zod"

// ─── Create Booking ───────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  carId: z.number().int().positive(),
  pickupBranchId: z.number().int().positive(),
  dropoffBranchId: z.number().int().positive(),
  pickupDatetime: z.string().datetime({ offset: true }),
  dropoffDatetime: z.string().datetime({ offset: true }),
  addonIds: z.array(z.number().int().positive()).optional().default([]),
})

export type CreateBookingDto = z.infer<typeof createBookingSchema>

// ─── List Bookings (query) ────────────────────────────────────────────────────

export const listBookingsQuerySchema = z.object({
  status: z
    .enum([
      "pending_approval",
      "approved",
      "pending_payment",
      "confirmed",
      "active",
      "completed",
      "cancelled",
      "rejected",
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type ListBookingsQueryDto = z.infer<typeof listBookingsQuerySchema>

// ─── Approve (admin) ──────────────────────────────────────────────────────────

// No body required — approvedBy comes from req.user.id
export const approveBookingSchema = z.object({})

// ─── Reject (admin) ───────────────────────────────────────────────────────────

export const rejectBookingSchema = z.object({
  rejectionNote: z.string().min(1, "Rejection note is required").max(1000),
})

export type RejectBookingDto = z.infer<typeof rejectBookingSchema>
