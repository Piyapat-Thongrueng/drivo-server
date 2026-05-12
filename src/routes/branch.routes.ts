import { Router } from "express"
import { areasController } from "../controllers/areas.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"

const router = Router()

// พนักงานสาขา + super_admin — ลูกค้าทั่วไปเข้าไม่ได้
router.get(
  "/ping",
  authMiddleware,
  requireRole("branch_staff", "super_admin"),
  areasController.branchPing,
)

export default router
