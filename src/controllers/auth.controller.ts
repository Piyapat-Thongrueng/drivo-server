import { Request, Response, NextFunction } from "express"
import { authService } from "../services/auth.service"
import { RegisterDto, UpdateProfileDto } from "../types/dto/auth.dto"

// POST /api/auth/register
// สร้าง profile ใน users table หลังจาก user สมัครผ่าน Supabase Auth แล้ว
// ใช้ verifyToken middleware (ไม่ใช่ authMiddleware) เพราะยังไม่มี profile ใน DB
async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const supabaseAuthId = req.supabaseAuthId!
    const data = req.body as RegisterDto

    const newProfile = await authService.registerProfile(supabaseAuthId, data)

    res.status(201).json({
      success: true,
      message: "Profile registered successfully",
      data: newProfile,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/auth/me
// ดึง profile ของ user ที่ login อยู่
async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const userProfile = await authService.getMyProfile(userId)

    res.json({
      success: true,
      data: userProfile,
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/auth/me
// แก้ไข profile ของ user ที่ login อยู่
async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const data = req.body as UpdateProfileDto

    const updatedProfile = await authService.updateMyProfile(userId, data)

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    })
  } catch (error) {
    next(error)
  }
}

export const authController = {
  register,
  getMe,
  updateMe,
}
