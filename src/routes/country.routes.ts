import { Router } from "express"
import { countryController } from "../controllers/country.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { validate } from "../middlewares/validate.middleware"
import {
  createCountrySchema,
  updateCountrySchema,
} from "../types/dto/country.dto"

const router = Router()

// GET /api/countries — ทุกคนเข้าได้ ไม่ต้อง login (user ต้องเห็นตอนค้นหารถ)
router.get("/", countryController.listCountries)

// GET /api/countries/:id — ทุกคนเข้าได้
router.get("/:id", countryController.getCountry)

// POST /api/countries — super_admin เท่านั้น
router.post(
  "/",
  authMiddleware,
  requireRole("super_admin"),
  validate(createCountrySchema),
  countryController.createCountry,
)

// PATCH /api/countries/:id — super_admin เท่านั้น
router.patch(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  validate(updateCountrySchema),
  countryController.updateCountry,
)

// DELETE /api/countries/:id — super_admin เท่านั้น
router.delete(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  countryController.deleteCountry,
)

export default router
