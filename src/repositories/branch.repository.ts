import { and, count, eq, isNull, notInArray, or } from "drizzle-orm";
import { db } from "../db";
import { bookingStatus, bookings, branches, cars } from "../db/schema";
import { CreateBranchDto, UpdateBranchDto } from "../types/dto/branch.dto";

type BookingStatusValue = (typeof bookingStatus.enumValues)[number];

// สถานะ booking ที่ถือว่า "จบแล้ว" — ใช้ตรวจก่อนลบ branch
const TERMINAL_STATUSES: BookingStatusValue[] = [
  "cancelled",
  "completed",
  "rejected",
];

async function findAll(countryId?: number) {
  if (countryId) {
    return db
      .select()
      .from(branches)
      .where(eq(branches.countryId, countryId))
      .orderBy(branches.name);
  }
  return db.select().from(branches).orderBy(branches.name);
}

async function findById(id: number) {
  const result = await db
    .select()
    .from(branches)
    .where(eq(branches.id, BigInt(id)))
    .limit(1);

  return result[0] ?? null;
}

async function create(data: CreateBranchDto) {
  const result = await db
    .insert(branches)
    .values({
      ...data,
      // Drizzle numeric columns ต้องรับ string — convert จาก number ที่มาจาก DTO
      latitude: data.latitude != null ? String(data.latitude) : null,
      longitude: data.longitude != null ? String(data.longitude) : null,
    })
    .returning();
  return result[0];
}

async function updateById(id: number, data: UpdateBranchDto) {
  const result = await db
    .update(branches)
    .set({
      ...data,
      latitude: data.latitude != null ? String(data.latitude) : data.latitude,
      longitude:
        data.longitude != null ? String(data.longitude) : data.longitude,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(branches.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

async function deleteById(id: number) {
  const result = await db
    .delete(branches)
    .where(eq(branches.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

// ตรวจว่า branch มีรถอยู่ไหม (ทั้งรถที่จดทะเบียนและรถที่อยู่ที่นี่ตอนนี้)
async function hasCars(id: number) {
  const result = await db
    .select({ total: count() })
    .from(cars)
    .where(
      and(
        isNull(cars.deletedAt),
        or(eq(cars.branchId, id), eq(cars.currentBranchId, id)),
      ),
    );

  return result[0].total > 0;
}

// ตรวจว่า branch มี booking ที่ยังไม่จบอยู่ไหม
async function hasActiveBookings(id: number) {
  const result = await db
    .select({ total: count() })
    .from(bookings)
    .where(
      and(
        notInArray(bookings.status, TERMINAL_STATUSES),
        or(eq(bookings.pickupBranchId, id), eq(bookings.dropoffBranchId, id)),
      ),
    );

  return result[0].total > 0;
}

export const branchRepository = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  hasCars,
  hasActiveBookings,
};
