import { Router } from "express"
import { authController } from "../controllers/auth.controller"
import { authMiddleware, verifyToken } from "../middlewares/auth.middleware"
import { validate } from "../middlewares/validate.middleware"
import { registerSchema, updateProfileSchema } from "../types/dto/auth.dto"

const router = Router()

// POST /api/auth/register — ใช้ verifyToken เพราะยังไม่มี profile ใน DB
router.post(
  "/register",
  verifyToken,
  validate(registerSchema),
  authController.register
)

// GET /api/auth/me — ใช้ authMiddleware เพราะต้องการ profile ใน DB แล้ว
router.get("/me", authMiddleware, authController.getMe)

// PATCH /api/auth/me — ใช้ authMiddleware + validate body
router.patch(
  "/me",
  authMiddleware,
  validate(updateProfileSchema),
  authController.updateMe
)

export default router
