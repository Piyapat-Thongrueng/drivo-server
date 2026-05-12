import { userRepository } from "../repositories/user.repository"
import { RegisterDto, UpdateProfileDto } from "../types/dto/auth.dto"
import { createError } from "../utils/error"

async function registerProfile(authId: string, data: RegisterDto) {
  // ตรวจสอบว่า profile ถูกสร้างไปแล้วหรือยัง ป้องกัน duplicate
  const existingProfile = await userRepository.findByAuthId(authId)

  if (existingProfile) {
    throw createError("Profile already exists for this account", 409)
  }

  const newProfile = await userRepository.create(authId, data)
  return newProfile
}

async function getMyProfile(userId: number) {
  const userProfile = await userRepository.findById(userId)

  if (!userProfile) {
    throw createError("User not found", 404)
  }

  return userProfile
}

async function updateMyProfile(userId: number, data: UpdateProfileDto) {
  const updatedProfile = await userRepository.updateById(userId, data)

  if (!updatedProfile) {
    throw createError("User not found", 404)
  }

  return updatedProfile
}

export const authService = {
  registerProfile,
  getMyProfile,
  updateMyProfile,
}
