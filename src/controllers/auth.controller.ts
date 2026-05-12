import { Request, Response, NextFunction } from "express";
import { ROLE_DEFAULT_PATH } from "../config/role-paths";
import { authService } from "../services/auth.service";
import { RegisterDto, UpdateProfileDto } from "../types/dto/auth.dto";

// POST /api/auth/register
// สร้าง profile ใน users table หลังจาก user สมัครผ่าน Supabase Auth แล้ว
// ใช้ verifyToken middleware (ไม่ใช่ authMiddleware) เพราะยังไม่มี profile ใน DB
async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const supabaseAuthId = req.supabaseAuthId!;
    const data = req.body as RegisterDto;

    const { profile, isNew } = await authService.registerProfile(
      supabaseAuthId,
      data,
    );

    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew
        ? "Profile registered successfully"
        : "Profile already exists",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login
// หลัง client เรียก Supabase signInWithPassword แล้ว — ส่ง Bearer access token มา
// เพื่อยืนยัน profile + role และให้ path สำหรับ redirect ตาม role
async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const branchId = req.user!.branchId;

    const profile = await authService.getMyProfile(userId);

    res.json({
      success: true,
      message: "Logged in",
      data: {
        profile,
        role,
        branchId,
        defaultPath: ROLE_DEFAULT_PATH[role],
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me
// ดึง profile ของ user ที่ login อยู่
async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const userProfile = await authService.getMyProfile(userId);

    res.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/auth/me
// แก้ไข profile ของ user ที่ login อยู่
async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const data = req.body as UpdateProfileDto;

    const updatedProfile = await authService.updateMyProfile(userId, data);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
}

export const authController = {
  register,
  login,
  getMe,
  updateMe,
};
