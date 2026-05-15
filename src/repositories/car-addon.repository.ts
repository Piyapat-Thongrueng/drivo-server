import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { carAddons } from "../db/schema";
import { CreateCarAddonDto, UpdateCarAddonDto } from "../types/dto/car-addon.dto";

async function findAllByCarId(carId: number, onlyAvailable: boolean) {
  const conditions = [eq(carAddons.carId, carId)] as ReturnType<typeof eq>[];
  if (onlyAvailable) {
    conditions.push(eq(carAddons.isAvailable, true));
  }

  return db
    .select()
    .from(carAddons)
    .where(and(...conditions))
    .orderBy(carAddons.name);
}

async function findByIdAndCarId(addonId: number, carId: number) {
  const result = await db
    .select()
    .from(carAddons)
    .where(and(eq(carAddons.id, BigInt(addonId)), eq(carAddons.carId, carId)))
    .limit(1);

  return result[0] ?? null;
}

async function create(carId: number, data: CreateCarAddonDto) {
  const result = await db
    .insert(carAddons)
    .values({
      carId,
      name: data.name,
      description: data.description,
      pricePerDay: String(data.pricePerDay),
      isAvailable: data.isAvailable ?? true,
    })
    .returning();

  return result[0];
}

async function updateById(addonId: number, carId: number, data: UpdateCarAddonDto) {
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.pricePerDay !== undefined) {
    updates.pricePerDay = String(data.pricePerDay);
  }
  if (data.isAvailable !== undefined) updates.isAvailable = data.isAvailable;

  const result = await db
    .update(carAddons)
    .set(updates)
    .where(and(eq(carAddons.id, BigInt(addonId)), eq(carAddons.carId, carId)))
    .returning();

  return result[0] ?? null;
}

async function deleteById(addonId: number, carId: number) {
  const result = await db
    .delete(carAddons)
    .where(and(eq(carAddons.id, BigInt(addonId)), eq(carAddons.carId, carId)))
    .returning();

  return result[0] ?? null;
}

export const carAddonRepository = {
  findAllByCarId,
  findByIdAndCarId,
  create,
  updateById,
  deleteById,
};
