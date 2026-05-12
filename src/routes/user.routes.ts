import { Router } from "express"
import { areasController } from "../controllers/areas.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"

const router = Router()

// เฉพาะ role `user` — staff/admin เข้ามาได้ 403
router.get(
  "/ping",
  authMiddleware,
  requireRole("user"),
  areasController.userPing,
)

export default router
