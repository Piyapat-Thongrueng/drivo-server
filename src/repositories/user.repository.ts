import { eq } from "drizzle-orm"
import { db } from "../db"
import { users } from "../db/schema"
import { RegisterDto, UpdateProfileDto } from "../types/dto/auth.dto"

async function findByAuthId(authId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.authId, authId))
    .limit(1)

  return result[0] ?? null
}

async function findById(id: number) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, BigInt(id)))
    .limit(1)

  return result[0] ?? null
}

async function create(authId: string, data: RegisterDto) {
  const result = await db
    .insert(users)
    .values({
      authId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
    })
    .returning()

  return result[0]
}

async function updateById(id: number, data: UpdateProfileDto) {
  const result = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, BigInt(id)))
    .returning()

  return result[0] ?? null
}

export const userRepository = {
  findByAuthId,
  findById,
  create,
  updateById,
}
