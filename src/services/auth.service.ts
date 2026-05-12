import { userRepository } from "../repositories/user.repository"
import { RegisterDto, UpdateProfileDto } from "../types/dto/auth.dto"
import { createError } from "../utils/error"

type UserRow = NonNullable<Awaited<ReturnType<typeof userRepository.findByAuthId>>>

/** Maps signup body → PATCH profile shape (same fields we store on users). */
function registerDtoToUpdatePayload(data: RegisterDto): UpdateProfileDto {
  const payload: UpdateProfileDto = {
    firstName: data.firstName,
    lastName: data.lastName,
  }
  if (data.phone !== undefined) {
    payload.phone = data.phone
  }
  return payload
}

/** Applies form fields onto an existing row (double-submit or filling empty names). */
async function mergeRegisterIntoExistingUser(
  row: UserRow,
  data: RegisterDto,
): Promise<UserRow> {
  const payload = registerDtoToUpdatePayload(data)
  const updated = await userRepository.updateById(Number(row.id), payload)
  return updated ?? row
}

/**
 * Register app profile after Supabase Auth sign-up.
 *
 * - No row yet → insert.
 * - Row already exists (same auth_id) → update first/last/phone from the form — safe if the user double-clicks.
 */
async function registerProfile(authId: string, data: RegisterDto) {
  const existing = await userRepository.findByAuthId(authId)

  if (existing) {
    const profile = await mergeRegisterIntoExistingUser(existing, data)
    return { profile, isNew: false }
  }

  const profile = await userRepository.create(authId, data)
  return { profile, isNew: true }
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
