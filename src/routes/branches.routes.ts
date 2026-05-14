import { Router } from "express"
import { branchController } from "../controllers/branch.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { validate } from "../middlewares/validate.middleware"
import { createBranchSchema, updateBranchSchema } from "../types/dto/branch.dto"

const router = Router()

// GET /api/branches — ทุกคนเข้าได้ (รองรับ ?countryId=1)
router.get("/", branchController.listBranches)

// GET /api/branches/:id — ทุกคนเข้าได้
router.get("/:id", branchController.getBranch)

// POST /api/branches — super_admin เท่านั้น
router.post(
  "/",
  authMiddleware,
  requireRole("super_admin"),
  validate(createBranchSchema),
  branchController.createBranch,
)

// PATCH /api/branches/:id — super_admin เท่านั้น
router.patch(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  validate(updateBranchSchema),
  branchController.updateBranch,
)

// DELETE /api/branches/:id — super_admin เท่านั้น
router.delete(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  branchController.deleteBranch,
)

export default router
