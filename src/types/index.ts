import { userRole } from "../db/schema"

export type UserRole = (typeof userRole.enumValues)[number]

export type AuthenticatedUser = {
  id: number
  role: UserRole
  branchId: number | null
}

// Augment Express Request so every controller gets req.user with full type safety
declare global {
  namespace Express {
    interface Request {
      // Set by authMiddleware (JWT verified + DB profile loaded)
      user?: AuthenticatedUser
      // Set by verifyToken (JWT verified only — no DB profile required)
      // ใช้สำหรับ endpoints ที่ต้องการ verified Supabase user แต่ยังไม่มี profile ใน DB เช่น register
      supabaseAuthId?: string
    }
  }
}
