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
  const result = await db.insert(countries).values(data).returning();

  return result[0];
}

async function updateById(id: number, data: UpdateCountryDto) {
  const result = await db
    .update(countries)
    .set({ ...data, updatedAt: new Date().toISOString() })
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
