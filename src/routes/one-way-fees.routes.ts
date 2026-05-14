import { Router } from "express"
import { oneWayFeeController } from "../controllers/one-way-fee.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { validate } from "../middlewares/validate.middleware"
import { createOneWayFeeSchema, updateOneWayFeeSchema } from "../types/dto/one-way-fee.dto"

const router = Router()

// GET /api/one-way-fees — ทุกคนเข้าได้ (รองรับ ?fromBranchId=1&toBranchId=2)
router.get("/", oneWayFeeController.listFees)

// POST /api/one-way-fees — super_admin เท่านั้น
router.post(
  "/",
  authMiddleware,
  requireRole("super_admin"),
  validate(createOneWayFeeSchema),
  oneWayFeeController.setFee,
)

// PATCH /api/one-way-fees/:id — super_admin เท่านั้น
router.patch(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  validate(updateOneWayFeeSchema),
  oneWayFeeController.updateFee,
)

export default router
