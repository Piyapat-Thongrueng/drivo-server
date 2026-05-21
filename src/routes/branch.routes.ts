import { Router } from "express"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireBranchStaff } from "../middlewares/role.middleware"
import { handoverController } from "../controllers/handover.controller"

const router = Router()

// ทุก route ใน /api/branch ต้องผ่าน auth + branch_staff check
router.use(authMiddleware, requireBranchStaff)

// ─── Branch info ──────────────────────────────────────────────────────────────
router.get("/me", handoverController.getBranchMe)

// ─── Queues ───────────────────────────────────────────────────────────────────
router.get("/queues/pickup", handoverController.getPickupQueue)
router.get("/queues/return", handoverController.getReturnQueue)

// ─── Booking detail + Handover actions ───────────────────────────────────────
router.get("/bookings/:id", handoverController.getBookingDetail)
router.post("/bookings/:id/pickup", handoverController.submitPickup)
router.post("/bookings/:id/return", handoverController.submitReturn)

export default router
