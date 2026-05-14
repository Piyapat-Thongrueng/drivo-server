import { and, count, eq, gt, inArray, isNull, lt, notInArray } from "drizzle-orm";
import { db } from "../db";
import { bookings, cars } from "../db/schema";
import { CreateCarDto, UpdateCarDto } from "../types/dto/car.dto";

// ─── List ────────────────────────────────────────────────────────────────────

// GET /api/cars — admin ดูทั้งหมด ยกเว้น soft-deleted
async function findAll(branchId?: number) {
  if (branchId) {
    return db
      .select()
      .from(cars)
      .where(and(isNull(cars.deletedAt), eq(cars.branchId, branchId)))
      .orderBy(cars.make, cars.model);
  }
  return db
    .select()
    .from(cars)
    .where(isNull(cars.deletedAt))
    .orderBy(cars.make, cars.model);
}

// GET /api/cars/available — รถว่างตาม branch + ช่วงเวลา
async function findAvailable(
  pickupBranchId: number,
  pickupDatetime: string,
  dropoffDatetime: string,
) {
  // 1. หา car ID ที่มี booking ชนกันในช่วงเวลานั้น
  const conflicting = await db
    .selectDistinct({ carId: bookings.carId })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["confirmed", "active"]),
        lt(bookings.pickupDatetime, dropoffDatetime),
        gt(bookings.dropoffDatetime, pickupDatetime),
      ),
    );

  const blockedIds = conflicting.map((r) => BigInt(r.carId));

  // 2. เลือกรถที่ว่าง ณ branch นั้น และไม่ติดจอง
  const conditions = [
    isNull(cars.deletedAt),
    eq(cars.status, "available"),
    eq(cars.currentBranchId, pickupBranchId),
  ] as ReturnType<typeof eq>[];

  if (blockedIds.length > 0) {
    conditions.push(notInArray(cars.id, blockedIds) as ReturnType<typeof eq>);
  }

  return db
    .select()
    .from(cars)
    .where(and(...conditions))
    .orderBy(cars.dailyRate);
}

// GET /api/cars/:id — ยกเว้น soft-deleted
async function findById(id: number) {
  const result = await db
    .select()
    .from(cars)
    .where(and(isNull(cars.deletedAt), eq(cars.id, BigInt(id))))
    .limit(1);

  return result[0] ?? null;
}

// ตรวจว่ามีรถที่มี licensePlate นี้อยู่แล้วไหม (สำหรับเช็ค unique ก่อน error จาก DB)
async function findByLicensePlate(licensePlate: string) {
  const result = await db
    .select()
    .from(cars)
    .where(and(isNull(cars.deletedAt), eq(cars.licensePlate, licensePlate)))
    .limit(1);

  return result[0] ?? null;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

async function create(data: CreateCarDto) {
  const result = await db
    .insert(cars)
    .values({
      branchId: data.branchId,
      currentBranchId: data.branchId, // ตอนสร้างใหม่ รถอยู่ที่ home branch เสมอ
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      licensePlate: data.licensePlate,
      imageUrl: data.imageUrl ?? null,
      carType: data.carType,
      seats: data.seats,
      luggageCapacity: data.luggageCapacity,
      doors: data.doors ?? 4,
      transmission: data.transmission,
      fuelType: data.fuelType,
      hourlyRate: String(data.hourlyRate), // Drizzle numeric ต้องเป็น string
      dailyRate: String(data.dailyRate),
      description: data.description ?? null,
      status: data.status ?? "available",
    })
    .returning();

  return result[0];
}

async function updateById(id: number, data: UpdateCarDto) {
  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // Drizzle numeric columns ต้องเป็น string
  if (data.hourlyRate != null) updates.hourlyRate = String(data.hourlyRate);
  if (data.dailyRate != null) updates.dailyRate = String(data.dailyRate);

  const result = await db
    .update(cars)
    .set(updates)
    .where(eq(cars.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

// Soft delete — ตั้ง deletedAt แทนการลบจริง เพื่อ preserve booking history
async function softDelete(id: number) {
  const result = await db
    .update(cars)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(cars.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

// ─── Business rule checks ────────────────────────────────────────────────────

// ตรวจว่ารถมี booking ที่ active อยู่ไหม (confirmed หรือ active)
async function hasActiveBookings(carId: number) {
  const result = await db
    .select({ total: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.carId, carId),
        inArray(bookings.status, ["confirmed", "active"]),
      ),
    );

  return result[0].total > 0;
}

export const carRepository = {
  findAll,
  findAvailable,
  findById,
  findByLicensePlate,
  create,
  updateById,
  softDelete,
  hasActiveBookings,
};
