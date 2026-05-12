import { Request, Response, NextFunction } from "express"
import { supabase } from "../lib/supabase"
import { userRepository } from "../repositories/user.repository"

// ตรวจสอบ JWT เท่านั้น ยังไม่ต้องมี profile ใน DB
// ใช้สำหรับ POST /api/auth/register ที่ user ยังไม่มี profile
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Please login to continue",
    })
    return
  }

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !authUser) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
    return
  }

  // เก็บ Supabase auth UUID ไว้ใน request ให้ controller ใช้ต่อ
  req.supabaseAuthId = authUser.id
  next()
}

// ตรวจสอบ JWT และต้องมี profile ใน users table แล้ว
// ใช้สำหรับทุก endpoint ที่ต้องการ login และมี profile แล้ว
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Please login to continue",
    })
    return
  }

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !authUser) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
    return
  }

  // ดึง profile จาก database เพื่อเอา role และ branch_id
  const userProfile = await userRepository.findByAuthId(authUser.id)

  if (!userProfile) {
    res.status(401).json({
      success: false,
      message: "User profile not found. Please complete registration.",
    })
    return
  }

  // เก็บข้อมูล user ไว้ใน request ให้ controllers ใช้ต่อได้
  req.user = {
    id: Number(userProfile.id),
    role: userProfile.role,
    branchId: userProfile.branchId,
  }

  next()
}
