import { NextFunction, Request, Response } from "express"
import { paymentService } from "../services/payment.service"
import { parsePositiveIntParam } from "../utils/parse-id"
import type { CreateCheckoutSessionDto } from "../types/dto/payment.dto"

// POST /api/bookings/:id/checkout-session
async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = parsePositiveIntParam(req.params.id, "booking id")
    const result = await paymentService.createCheckoutSession(
      bookingId,
      req.body as CreateCheckoutSessionDto,
      req.user!,
    )
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

// GET /api/bookings/:id/payments
async function listBookingPayments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = parsePositiveIntParam(req.params.id, "booking id")
    const result = await paymentService.listBookingPayments(bookingId, req.user!)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

// POST /api/webhooks/stripe
// raw body ถูกส่งมาผ่าน express.raw() middleware ใน app.ts
async function stripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Stripe ต้องการ raw body (Buffer) ไม่ใช่ parsed JSON
    const signature = req.headers["stripe-signature"] as string
    if (!signature) {
      res.status(400).json({ success: false, message: "Missing stripe-signature header" })
      return
    }

    const result = await paymentService.handleStripeWebhook(req.body as Buffer, signature)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const paymentController = {
  createCheckoutSession,
  listBookingPayments,
  stripeWebhook,
}
