import { Router } from "express"
import { areasController } from "../controllers/areas.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"

const router = Router()

// เฉพาะพนักงานสาขา — user / super_admin เข้าไม่ได้ (แอดมินใช้ /api/admin/... แทน)
router.get(
  "/ping",
  authMiddleware,
  requireRole("branch_staff"),
  areasController.branchPing,
)

export default router
