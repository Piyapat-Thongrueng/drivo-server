import { and, desc, eq, gt, inArray, lt, ne } from "drizzle-orm"
import { db } from "../db"
import {
  bookingAddons,
  bookings,
  payments,
} from "../db/schema"
import { AVAILABILITY_BLOCKING_STATUSES } from "../config/booking.constants"
import type { CreateBookingDto } from "../types/dto/booking.dto"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBookingData {
  reference: string
  userId: number
  carId: number
  pickupBranchId: number
  dropoffBranchId: number
  pickupDatetime: string
  dropoffDatetime: string
  hourlyRate: string
  dailyRate: string
  baseAmount: string
  addonAmount: string
  oneWayFee: string
  totalAmount: string
  depositAmount: string
  currencyCode: string
}

export interface CreateBookingAddonData {
  bookingId: number
  addonId: number
  name: string
  pricePerDay: string
  totalPrice: string
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** ดึงรายการจองของ user คนเดียว เรียงล่าสุดก่อน */
async function findByUserId(userId: number) {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.createdAt))
}

/** ดึงทั้งหมดสำหรับ admin (optional filter by status + pagination) */
async function findAll(opts?: {
  status?: (typeof bookings.$inferSelect)["status"]
  limit?: number
  offset?: number
}) {
  const conditions = []
  if (opts?.status) {
    conditions.push(eq(bookings.status, opts.status))
  }

  return db
    .select()
    .from(bookings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(opts?.limit ?? 20)
    .offset(opts?.offset ?? 0)
}

/** ดึง booking เดี่ยว รวม addons */
async function findById(id: number) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, BigInt(id)))
    .limit(1)

  if (!booking) return null

  const addons = await db
    .select()
    .from(bookingAddons)
    .where(eq(bookingAddons.bookingId, id)) // bookingId is mode:"number"

  return { ...booking, addons }
}

/** ตรวจว่ารถคันนั้นมี booking ชนกับช่วงเวลาที่ขอหรือไม่ */
async function hasOverlap(
  carId: number,
  pickupDatetime: string,
  dropoffDatetime: string,
  excludeBookingId?: number,
): Promise<boolean> {
  const conditions = [
    eq(bookings.carId, carId),
    inArray(bookings.status, [...AVAILABILITY_BLOCKING_STATUSES]),
    lt(bookings.pickupDatetime, dropoffDatetime),
    gt(bookings.dropoffDatetime, pickupDatetime),
  ]

  if (excludeBookingId) {
    conditions.push(ne(bookings.id, BigInt(excludeBookingId)))
  }

  const result = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...conditions))
    .limit(1)

  return result.length > 0
}

// ─── Write ────────────────────────────────────────────────────────────────────

async function create(data: CreateBookingData) {
  const [booking] = await db
    .insert(bookings)
    .values({
      reference: data.reference,
      userId: data.userId,
      carId: data.carId,
      pickupBranchId: data.pickupBranchId,
      dropoffBranchId: data.dropoffBranchId,
      pickupDatetime: data.pickupDatetime,
      dropoffDatetime: data.dropoffDatetime,
      hourlyRate: data.hourlyRate,
      dailyRate: data.dailyRate,
      baseAmount: data.baseAmount,
      addonAmount: data.addonAmount,
      oneWayFee: data.oneWayFee,
      totalAmount: data.totalAmount,
      depositAmount: data.depositAmount,
      currencyCode: data.currencyCode,
      status: "pending_approval",
    })
    .returning()

  return booking
}

async function createAddons(addonsData: CreateBookingAddonData[]) {
  if (addonsData.length === 0) return []
  return db.insert(bookingAddons).values(addonsData).returning()
}

/** approve → pending_payment + สร้าง 2 payment rows */
async function approveBooking(
  bookingId: number,
  approvedBy: number,
  paymentDeadline: string,
  totalAmount: string,
  depositAmount: string,
  currencyCode: string,
) {
  const [updated] = await db
    .update(bookings)
    .set({
      status: "pending_payment",
      approvedBy,
      approvedAt: new Date().toISOString(),
      paymentDeadline,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bookings.id, BigInt(bookingId)))
    .returning()

  // สร้าง 2 payment rows พร้อมกัน
  await db.insert(payments).values([
    {
      bookingId,
      paymentType: "rental",
      amount: totalAmount,
      currencyCode,
      status: "pending",
    },
    {
      bookingId,
      paymentType: "deposit",
      amount: depositAmount,
      currencyCode,
      status: "pending",
    },
  ])

  return updated
}

async function rejectBooking(bookingId: number, rejectionNote: string) {
  const [updated] = await db
    .update(bookings)
    .set({
      status: "rejected",
      rejectionNote,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bookings.id, BigInt(bookingId)))
    .returning()

  return updated
}

async function cancelBooking(bookingId: number) {
  const [updated] = await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bookings.id, BigInt(bookingId)))
    .returning()

  return updated
}

/** Cron: cancel bookings ที่ pending_payment และ payment_deadline เลยแล้ว */
async function cancelExpiredBookings() {
  return db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(bookings.status, "pending_payment"),
        lt(bookings.paymentDeadline, new Date().toISOString()),
      ),
    )
    .returning()
}

export const bookingRepository = {
  findByUserId,
  findAll,
  findById,
  hasOverlap,
  create,
  createAddons,
  approveBooking,
  rejectBooking,
  cancelBooking,
  cancelExpiredBookings,
}
