import { Router } from "express"
import { bookingController } from "../controllers/booking.controller"
import { paymentController } from "../controllers/payment.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { validate } from "../middlewares/validate.middleware"
import { createBookingSchema } from "../types/dto/booking.dto"
import { createCheckoutSessionSchema } from "../types/dto/payment.dto"

const router = Router()

// POST /api/bookings — user สร้างจอง
router.post(
  "/",
  authMiddleware,
  requireRole("user"),
  validate(createBookingSchema),
  bookingController.createBooking,
)

// GET /api/bookings — user ดูรายการจองของตัวเอง
router.get(
  "/",
  authMiddleware,
  requireRole("user"),
  bookingController.listMyBookings,
)

// GET /api/bookings/:id — owner หรือ admin ดูรายละเอียด
router.get(
  "/:id",
  authMiddleware,
  bookingController.getBooking,
)

// PATCH /api/bookings/:id/cancel — owner ยกเลิก
router.patch(
  "/:id/cancel",
  authMiddleware,
  bookingController.cancelBooking,
)

// POST /api/bookings/:id/checkout-session — user สร้าง Stripe Checkout Session
router.post(
  "/:id/checkout-session",
  authMiddleware,
  requireRole("user"),
  validate(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
)

// GET /api/bookings/:id/payments — owner หรือ admin ดูประวัติชำระ
router.get(
  "/:id/payments",
  authMiddleware,
  paymentController.listBookingPayments,
)

export default router
