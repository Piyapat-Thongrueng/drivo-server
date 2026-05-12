import { Router } from "express"
import { areasController } from "../controllers/areas.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"

const router = Router()

// เฉพาะ super_admin
router.get(
  "/ping",
  authMiddleware,
  requireRole("super_admin"),
  areasController.adminPing,
)

export default router
