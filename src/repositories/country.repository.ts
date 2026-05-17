import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { branches, countries } from "../db/schema";
import { CreateCountryDto, UpdateCountryDto } from "../types/dto/country.dto";

async function findAll() {
  return db.select().from(countries).orderBy(countries.name);
}

async function findById(id: number) {
  const result = await db
    .select()
    .from(countries)
    .where(eq(countries.id, BigInt(id)))
    .limit(1);

  return result[0] ?? null;
}

async function findByCode(code: string) {
  const result = await db
    .select()
    .from(countries)
    .where(eq(countries.code, code))
    .limit(1);

  return result[0] ?? null;
}

async function create(data: CreateCountryDto) {
  const result = await db
    .insert(countries)
    .values({
      name: data.name,
      code: data.code,
      currencyCode: data.currencyCode,
      timezone: data.timezone,
      isActive: data.isActive,
      defaultDepositAmount: String(data.defaultDepositAmount),
    })
    .returning();

  return result[0];
}

async function updateById(id: number, data: UpdateCountryDto) {
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.code !== undefined) updates.code = data.code;
  if (data.currencyCode !== undefined) updates.currencyCode = data.currencyCode;
  if (data.timezone !== undefined) updates.timezone = data.timezone;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.defaultDepositAmount !== undefined) {
    updates.defaultDepositAmount = String(data.defaultDepositAmount);
  }

  const result = await db
    .update(countries)
    .set(updates)
    .where(eq(countries.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

async function deleteById(id: number) {
  const result = await db
    .delete(countries)
    .where(eq(countries.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

// ตรวจว่าประเทศนี้มี branch อยู่หรือไม่ก่อนลบ
async function hasBranches(id: number) {
  const result = await db
    .select({ total: count() })
    .from(branches)
    .where(eq(branches.countryId, id));

  return result[0].total > 0;
}

export const countryRepository = {
  findAll,
  findById,
  findByCode,
  create,
  updateById,
  deleteById,
  hasBranches,
};
