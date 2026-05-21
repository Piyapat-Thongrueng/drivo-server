import { Router } from "express"
import { areasController } from "../controllers/areas.controller"
import { bookingController } from "../controllers/booking.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { validate } from "../middlewares/validate.middleware"
import {
  listBookingsQuerySchema,
  rejectBookingSchema,
} from "../types/dto/booking.dto"

const router = Router()

// เฉพาะ super_admin
router.get(
  "/ping",
  authMiddleware,
  requireRole("super_admin"),
  areasController.adminPing,
)

// ─── Booking management (admin) ───────────────────────────────────────────────

// GET /api/admin/bookings?status=pending_approval&page=1&limit=20
router.get(
  "/bookings",
  authMiddleware,
  requireRole("super_admin"),
  validate(listBookingsQuerySchema, "query"),
  bookingController.listAllBookings,
)

// PATCH /api/admin/bookings/:id/approve
router.patch(
  "/bookings/:id/approve",
  authMiddleware,
  requireRole("super_admin"),
  bookingController.approveBooking,
)

// PATCH /api/admin/bookings/:id/reject
router.patch(
  "/bookings/:id/reject",
  authMiddleware,
  requireRole("super_admin"),
  validate(rejectBookingSchema),
  bookingController.rejectBooking,
)

export default router
