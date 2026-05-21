import { Request, Response, NextFunction } from "express"
import { UserRole } from "../types"

// Factory function ที่รับ roles ที่อนุญาตแล้ว return middleware
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      })
      return
    }

    next()
  }
}

/**
 * Middleware เฉพาะ branch_staff — ตรวจทั้ง role และ branchId
 * branch_staff ที่ไม่มีสาขาผูกอยู่ถือว่า config ผิดพลาด → 403
 */
export function requireBranchStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.user

  if (!user || user.role !== "branch_staff") {
    res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource",
    })
    return
  }

  if (user.branchId == null) {
    res.status(403).json({
      success: false,
      message: "Your account is not assigned to a branch. Please contact an administrator.",
    })
    return
  }

  next()
}
