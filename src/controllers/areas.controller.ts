import { Request, Response } from "express"

/** Example: customer-only area — replace with real handlers later. */
function userPing(req: Request, res: Response): void {
  res.json({
    success: true,
    scope: "user",
    data: { userId: req.user!.id },
  })
}

/** Branch dashboard API — branch_staff + super_admin */
function branchPing(req: Request, res: Response): void {
  res.json({
    success: true,
    scope: "branch",
    data: {
      userId: req.user!.id,
      role: req.user!.role,
      branchId: req.user!.branchId,
    },
  })
}

/** Super-admin-only API */
function adminPing(req: Request, res: Response): void {
  res.json({
    success: true,
    scope: "super_admin",
    data: { userId: req.user!.id },
  })
}

export const areasController = {
  userPing,
  branchPing,
  adminPing,
}
