import { Router } from "express"
import { pricingController } from "../controllers/pricing.controller"
import { optionalAuthMiddleware } from "../middlewares/auth.middleware"
import { validate } from "../middlewares/validate.middleware"
import { pricingPreviewSchema } from "../types/dto/pricing.dto"

const router = Router()

// POST /api/pricing/preview — optional auth (guest ใช้ได้ก่อน login)
router.post(
  "/preview",
  optionalAuthMiddleware,
  validate(pricingPreviewSchema),
  pricingController.previewPricing,
)

export default router
