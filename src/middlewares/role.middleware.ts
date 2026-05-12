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
