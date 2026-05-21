import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "../db"
import {
  branches,
  carAddons,
  cars,
  countries,
  oneWayFees,
} from "../db/schema"
import { bookingRepository } from "../repositories/booking.repository"
import { PAYMENT_DEADLINE_MS } from "../config/booking.constants"
import { resolveCountryDepositAmount } from "../utils/deposit"
import {
  calculateAddonAmount,
  calculateDaysAndHours,
  calculatePricing,
} from "../utils/pricing"
import { createError } from "../utils/error"
import type { AuthenticatedUser } from "../types"
import type {
  CreateBookingDto,
  ListBookingsQueryDto,
  RejectBookingDto,
} from "../types/dto/booking.dto"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** สร้าง reference เช่น DRV-20260516-A3F2 */
function generateReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DRV-${date}-${rand}`
}

// ─── Customer endpoints ───────────────────────────────────────────────────────

/** POST /api/bookings */
async function createBooking(dto: CreateBookingDto, user: AuthenticatedUser) {
  // 1. ตรวจ dates
  if (dto.dropoffDatetime <= dto.pickupDatetime) {
    throw createError("Drop-off must be after pick-up", 400)
  }

  // 2. ดึงรถพร้อม branch + country
  const carRows = await db
    .select({
      id: cars.id,
      status: cars.status,
      currentBranchId: cars.currentBranchId,
      hourlyRate: cars.hourlyRate,
      dailyRate: cars.dailyRate,
    })
    .from(cars)
    .where(and(isNull(cars.deletedAt), eq(cars.id, BigInt(dto.carId))))
    .limit(1)

  const car = carRows[0]
  if (!car) throw createError("Car not found", 404)
  if (car.status !== "available") throw createError("Car is not available", 409)
  if (Number(car.currentBranchId) !== dto.pickupBranchId) {
    throw createError("Car is not at the selected pickup branch", 409)
  }

  // 3. ตรวจ overlap ด้วย AVAILABILITY_BLOCKING_STATUSES
  const overlap = await bookingRepository.hasOverlap(
    dto.carId,
    dto.pickupDatetime,
    dto.dropoffDatetime,
  )
  if (overlap) {
    throw createError("Car is already booked for the selected period", 409)
  }

  // 4. ดึง branch + country (timezone + currency)
  const branchRows = await db
    .select({
      id: branches.id,
      timezone: countries.timezone,
      currencyCode: countries.currencyCode,
      defaultDepositAmount: countries.defaultDepositAmount,
    })
    .from(branches)
    .innerJoin(countries, eq(branches.countryId, countries.id))
    .where(eq(branches.id, BigInt(dto.pickupBranchId)))
    .limit(1)

  const branch = branchRows[0]
  if (!branch) throw createError("Pickup branch not found", 404)

  const depositAmount = resolveCountryDepositAmount(branch.defaultDepositAmount)

  // 5. Validate dropoff branch
  if (dto.dropoffBranchId !== dto.pickupBranchId) {
    const dropoffRows = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, BigInt(dto.dropoffBranchId)))
      .limit(1)
    if (!dropoffRows[0]) throw createError("Drop-off branch not found", 404)
  }

  // 6. One-way fee
  let oneWayFee = 0
  if (dto.pickupBranchId !== dto.dropoffBranchId) {
    const feeRows = await db
      .select({ fee: oneWayFees.fee })
      .from(oneWayFees)
      .where(
        and(
          eq(oneWayFees.fromBranchId, dto.pickupBranchId),
          eq(oneWayFees.toBranchId, dto.dropoffBranchId),
        ),
      )
      .limit(1)
    oneWayFee = feeRows[0] ? Number(feeRows[0].fee) : 0
  }

  // 7. Addons (ตรวจว่าเป็นของรถคันนี้และ available)
  const addonRows =
    dto.addonIds.length > 0
      ? await db
          .select({
            id: carAddons.id,
            name: carAddons.name,
            pricePerDay: carAddons.pricePerDay,
          })
          .from(carAddons)
          .where(
            and(
              eq(carAddons.carId, dto.carId),
              inArray(
                carAddons.id,
                dto.addonIds.map((id) => BigInt(id)),
              ),
              eq(carAddons.isAvailable, true),
            ),
          )
      : []

  // ตรวจว่า addonIds ที่ส่งมาหาเจอครบทุกตัว
  if (addonRows.length !== dto.addonIds.length) {
    throw createError("One or more addons are invalid or unavailable", 400)
  }

  // 8. คำนวณราคา
  const { days } = calculateDaysAndHours(
    dto.pickupDatetime,
    dto.dropoffDatetime,
    branch.timezone,
  )
  const addonAmount = calculateAddonAmount(
    addonRows.map((a) => ({ pricePerDay: Number(a.pricePerDay) })),
    days,
  )
  const pricing = calculatePricing(
    dto.pickupDatetime,
    dto.dropoffDatetime,
    branch.timezone,
    Number(car.dailyRate),
    Number(car.hourlyRate),
    addonAmount,
    oneWayFee,
    depositAmount,
  )

  // 9. สร้าง booking
  let reference = generateReference()
  // ป้องกัน reference ชน (retry หนึ่งครั้ง)
  try {
    const booking = await bookingRepository.create({
      reference,
      userId: user.id,
      carId: dto.carId,
      pickupBranchId: dto.pickupBranchId,
      dropoffBranchId: dto.dropoffBranchId,
      pickupDatetime: dto.pickupDatetime,
      dropoffDatetime: dto.dropoffDatetime,
      hourlyRate: car.hourlyRate,
      dailyRate: car.dailyRate,
      baseAmount: String(pricing.baseAmount),
      addonAmount: String(pricing.addonAmount),
      oneWayFee: String(pricing.oneWayFee),
      totalAmount: String(pricing.totalAmount),
      depositAmount: String(pricing.depositAmount),
      currencyCode: branch.currencyCode,
    })

    // 10. Snapshot addons
    if (addonRows.length > 0) {
      await bookingRepository.createAddons(
        addonRows.map((a) => ({
          bookingId: Number(booking.id),
          addonId: Number(a.id),
          name: a.name,
          pricePerDay: a.pricePerDay,
          totalPrice: String(
            Math.round(Number(a.pricePerDay) * (days > 0 ? days : 1) * 100) / 100,
          ),
        })),
      )
    }

    return booking
  } catch (err: unknown) {
    // unique constraint on reference → retry once
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      reference = generateReference()
      const booking = await bookingRepository.create({
        reference,
        userId: user.id,
        carId: dto.carId,
        pickupBranchId: dto.pickupBranchId,
        dropoffBranchId: dto.dropoffBranchId,
        pickupDatetime: dto.pickupDatetime,
        dropoffDatetime: dto.dropoffDatetime,
        hourlyRate: car.hourlyRate,
        dailyRate: car.dailyRate,
        baseAmount: String(pricing.baseAmount),
        addonAmount: String(pricing.addonAmount),
        oneWayFee: String(pricing.oneWayFee),
        totalAmount: String(pricing.totalAmount),
        depositAmount: String(pricing.depositAmount),
        currencyCode: branch.currencyCode,
      })
      return booking
    }
    throw err
  }
}

/** GET /api/bookings — รายการของ user เอง */
async function listMyBookings(user: AuthenticatedUser) {
  return bookingRepository.findByUserId(user.id)
}

/** GET /api/bookings/:id — owner หรือ admin เห็น */
async function getBooking(id: number, user: AuthenticatedUser) {
  const booking = await bookingRepository.findById(id)
  if (!booking) throw createError("Booking not found", 404)

  if (user.role !== "super_admin" && booking.userId !== user.id) {
    throw createError("You do not have permission to view this booking", 403)
  }

  return booking
}

/** PATCH /api/bookings/:id/cancel — owner ยกเลิกได้เฉพาะบางสถานะ */
async function cancelBooking(id: number, user: AuthenticatedUser) {
  const booking = await bookingRepository.findById(id)
  if (!booking) throw createError("Booking not found", 404)

  if (user.role !== "super_admin" && booking.userId !== user.id) {
    throw createError("You do not have permission to cancel this booking", 403)
  }

  const cancellableStatuses = ["pending_approval", "pending_payment"]
  if (!cancellableStatuses.includes(booking.status)) {
    throw createError(
      `Cannot cancel a booking with status "${booking.status}"`,
      409,
    )
  }

  return bookingRepository.cancelBooking(id)
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/** GET /api/admin/bookings */
async function listAllBookings(query: ListBookingsQueryDto) {
  const offset = (query.page - 1) * query.limit
  return bookingRepository.findAll({
    status: query.status,
    limit: query.limit,
    offset,
  })
}

/** PATCH /api/admin/bookings/:id/approve */
async function approveBooking(id: number, admin: AuthenticatedUser) {
  const booking = await bookingRepository.findById(id)
  if (!booking) throw createError("Booking not found", 404)

  if (booking.status !== "pending_approval") {
    throw createError(
      `Cannot approve a booking with status "${booking.status}"`,
      409,
    )
  }

  const paymentDeadline = new Date(
    Date.now() + PAYMENT_DEADLINE_MS,
  ).toISOString()

  return bookingRepository.approveBooking(
    id,
    admin.id,
    paymentDeadline,
    booking.totalAmount ?? "0",
    booking.depositAmount,
    booking.currencyCode,
  )
}

/** PATCH /api/admin/bookings/:id/reject */
async function rejectBooking(
  id: number,
  dto: RejectBookingDto,
  _admin: AuthenticatedUser,
) {
  const booking = await bookingRepository.findById(id)
  if (!booking) throw createError("Booking not found", 404)

  if (booking.status !== "pending_approval") {
    throw createError(
      `Cannot reject a booking with status "${booking.status}"`,
      409,
    )
  }

  return bookingRepository.rejectBooking(id, dto.rejectionNote)
}

export const bookingService = {
  createBooking,
  listMyBookings,
  getBooking,
  cancelBooking,
  listAllBookings,
  approveBooking,
  rejectBooking,
}
