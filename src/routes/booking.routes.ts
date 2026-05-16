import { Router } from "express"
import { bookingController } from "../controllers/booking.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { validate } from "../middlewares/validate.middleware"
import { createBookingSchema } from "../types/dto/booking.dto"

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

export default router
