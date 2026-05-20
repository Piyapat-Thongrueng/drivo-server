import { and, eq, ilike, isNull, or } from "drizzle-orm"
import { db } from "../db"
import {
  bookingAddons,
  bookings,
  branches,
  cars,
  handoverPhotos,
  handovers,
  users,
} from "../db/schema"
import type { FuelLevel, PhotoAngle } from "../types/handover"

// ─── Queue item shape ─────────────────────────────────────────────────────────

export interface QueueRow {
  bookingId: number
  reference: string
  customerName: string
  carLabel: string
  licensePlate: string
  pickupDatetime: string
  dropoffDatetime: string
  pickupBranchName: string
  dropoffBranchName: string
}

// ─── Input types for transactions ─────────────────────────────────────────────

export interface InsertHandoverInput {
  bookingId: number
  branchId: number
  handledBy: number
  fuelLevel: FuelLevel
  extraCharge: number
  damageNote?: string | null
}

export interface InsertPhotoInput {
  storagePath: string
  url: string
  angle: PhotoAngle
}

export interface InsertPickupInput extends InsertHandoverInput {
  photos: InsertPhotoInput[]
}

export interface InsertReturnInput extends InsertHandoverInput {
  photos: InsertPhotoInput[]
  depositAmount: number
  forfeitAmount: number
  depositStatusValue: "released" | "partial" | "forfeited"
  dropoffBranchId: number
  carId: number
}

// ─── Read: Queues ─────────────────────────────────────────────────────────────

/**
 * Pick-up Queue: bookings ที่ status=confirmed, pickup_branch_id=branchId,
 * ยังไม่มี handover type=pickup
 */
async function findPickupQueue(branchId: number, search?: string): Promise<QueueRow[]> {
  const pickupBranch = {
    id: branches.id,
    name: branches.name,
  }

  // alias สำหรับ dropoff branch (ต้อง join branches สองครั้ง)
  const rows = await db
    .select({
      bookingId: bookings.id,
      reference: bookings.reference,
      firstName: users.firstName,
      lastName: users.lastName,
      carMake: cars.make,
      carModel: cars.model,
      licensePlate: cars.licensePlate,
      pickupDatetime: bookings.pickupDatetime,
      dropoffDatetime: bookings.dropoffDatetime,
      pickupBranchName: branches.name,
      handoverId: handovers.id,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(cars, eq(bookings.carId, cars.id))
    .innerJoin(branches, eq(bookings.pickupBranchId, branches.id))
    .leftJoin(
      handovers,
      and(eq(handovers.bookingId, bookings.id), eq(handovers.type, "pickup")),
    )
    .where(
      and(
        eq(bookings.status, "confirmed"),
        eq(bookings.pickupBranchId, branchId),
        isNull(handovers.id),
        search
          ? or(
              ilike(bookings.reference, `%${search}%`),
              ilike(users.firstName, `%${search}%`),
              ilike(users.lastName, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(bookings.pickupDatetime)

  // ดึงชื่อ dropoff branch แยกต่างหาก (Drizzle ไม่รองรับ alias join กับ same table โดยตรง)
  const result: QueueRow[] = await Promise.all(
    rows.map(async (r) => {
      const bookingRow = await db
        .select({ dropoffBranchName: branches.name })
        .from(bookings)
        .innerJoin(branches, eq(bookings.dropoffBranchId, branches.id))
        .where(eq(bookings.id, BigInt(r.bookingId)))
        .limit(1)

      return {
        bookingId: Number(r.bookingId),
        reference: r.reference,
        customerName: `${r.firstName} ${r.lastName}`.trim(),
        carLabel: `${r.carMake} ${r.carModel}`,
        licensePlate: r.licensePlate,
        pickupDatetime: r.pickupDatetime,
        dropoffDatetime: r.dropoffDatetime,
        pickupBranchName: r.pickupBranchName,
        dropoffBranchName: bookingRow[0]?.dropoffBranchName ?? "",
      }
    }),
  )

  void pickupBranch
  return result
}

/**
 * Return Queue: bookings ที่ status=active, dropoff_branch_id=branchId,
 * มี pickup handover แล้ว, ยังไม่มี return handover
 */
async function findReturnQueue(branchId: number, search?: string): Promise<QueueRow[]> {
  const pickupHandover = db.$with("pickup_hv").as(
    db
      .select({ bookingId: handovers.bookingId })
      .from(handovers)
      .where(eq(handovers.type, "pickup")),
  )

  // เราต้องการ booking ที่: active + dropoff_branch_id = branchId + ada pickup handover + no return handover
  // ใช้ two separate left joins on handovers ไม่ได้ง่ายๆ กับ Drizzle without CTE ดังนั้นใช้ subquery แทน
  const allActive = await db
    .select({
      bookingId: bookings.id,
      reference: bookings.reference,
      firstName: users.firstName,
      lastName: users.lastName,
      carMake: cars.make,
      carModel: cars.model,
      licensePlate: cars.licensePlate,
      pickupDatetime: bookings.pickupDatetime,
      dropoffDatetime: bookings.dropoffDatetime,
      dropoffBranchName: branches.name,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(cars, eq(bookings.carId, cars.id))
    .innerJoin(branches, eq(bookings.dropoffBranchId, branches.id))
    .where(
      and(
        eq(bookings.status, "active"),
        eq(bookings.dropoffBranchId, branchId),
        search
          ? or(
              ilike(bookings.reference, `%${search}%`),
              ilike(users.firstName, `%${search}%`),
              ilike(users.lastName, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(bookings.dropoffDatetime)

  void pickupHandover

  // กรอง: ต้องมี pickup handover และยังไม่มี return handover
  const filtered = await Promise.all(
    allActive.map(async (r) => {
      const bkId = Number(r.bookingId)
      const hasPickup = await db
        .select({ id: handovers.id })
        .from(handovers)
        .where(and(eq(handovers.bookingId, bkId), eq(handovers.type, "pickup")))
        .limit(1)

      const hasReturn = await db
        .select({ id: handovers.id })
        .from(handovers)
        .where(and(eq(handovers.bookingId, bkId), eq(handovers.type, "return")))
        .limit(1)

      if (hasPickup.length === 0 || hasReturn.length > 0) return null

      const pickupBranchRow = await db
        .select({ name: branches.name })
        .from(bookings)
        .innerJoin(branches, eq(bookings.pickupBranchId, branches.id))
        .where(eq(bookings.id, BigInt(r.bookingId)))
        .limit(1)

      return {
        bookingId: Number(r.bookingId),
        reference: r.reference,
        customerName: `${r.firstName} ${r.lastName}`.trim(),
        carLabel: `${r.carMake} ${r.carModel}`,
        licensePlate: r.licensePlate,
        pickupDatetime: r.pickupDatetime,
        dropoffDatetime: r.dropoffDatetime,
        pickupBranchName: pickupBranchRow[0]?.name ?? "",
        dropoffBranchName: r.dropoffBranchName,
      } satisfies QueueRow
    }),
  )

  return filtered.filter((r): r is QueueRow => r !== null)
}

// ─── Read: Booking detail for handover form ───────────────────────────────────

export interface BookingDetailForHandover {
  bookingId: number
  reference: string
  status: string
  pickupBranchId: number
  dropoffBranchId: number
  depositAmount: string
  currencyCode: string
  carId: number
  customer: {
    firstName: string
    lastName: string
    phone: string | null
  }
  car: {
    make: string
    model: string
    year: number
    licensePlate: string
  }
  pickupBranchName: string
  dropoffBranchName: string
  pickupDatetime: string
  dropoffDatetime: string
  addons: Array<{ name: string; totalPrice: string }>
  handovers: Array<{
    id: number
    type: string
    fuelLevel: string
    extraCharge: string
    photos: Array<{ id: number; url: string; angle: string | null }>
  }>
}

async function findBookingDetailForHandover(
  bookingId: number,
): Promise<BookingDetailForHandover | null> {
  if (!Number.isFinite(bookingId) || bookingId <= 0) return null

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, BigInt(bookingId)))
    .limit(1)

  if (!booking) return null

  const [customer] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, phone: users.phone })
    .from(users)
    .where(eq(users.id, BigInt(booking.userId)))
    .limit(1)

  const [car] = await db
    .select({ make: cars.make, model: cars.model, year: cars.year, licensePlate: cars.licensePlate })
    .from(cars)
    .where(eq(cars.id, BigInt(booking.carId)))
    .limit(1)

  const [pickupBranch] = await db
    .select({ name: branches.name })
    .from(branches)
    .where(eq(branches.id, BigInt(booking.pickupBranchId)))
    .limit(1)

  const [dropoffBranch] = await db
    .select({ name: branches.name })
    .from(branches)
    .where(eq(branches.id, BigInt(booking.dropoffBranchId)))
    .limit(1)

  const addons = await db
    .select({ name: bookingAddons.name, totalPrice: bookingAddons.totalPrice })
    .from(bookingAddons)
    .where(eq(bookingAddons.bookingId, bookingId))

  const existingHandovers = await db
    .select()
    .from(handovers)
    .where(eq(handovers.bookingId, bookingId))

  const handoversWithPhotos = await Promise.all(
    existingHandovers.map(async (hv) => {
      const rawPhotos = await db
        .select({ id: handoverPhotos.id, url: handoverPhotos.url, angle: handoverPhotos.angle })
        .from(handoverPhotos)
        .where(eq(handoverPhotos.handoverId, Number(hv.id)))
      return {
        id: Number(hv.id),
        type: hv.type,
        fuelLevel: hv.fuelLevel,
        extraCharge: hv.extraCharge,
        photos: rawPhotos.map((p) => ({ id: Number(p.id), url: p.url, angle: p.angle })),
      }
    }),
  )

  return {
    bookingId: Number(booking.id),
    reference: booking.reference,
    status: booking.status,
    pickupBranchId: booking.pickupBranchId,
    dropoffBranchId: booking.dropoffBranchId,
    depositAmount: booking.depositAmount,
    currencyCode: booking.currencyCode,
    carId: booking.carId,
    customer: customer ?? { firstName: "", lastName: "", phone: null },
    car: car ?? { make: "", model: "", year: 0, licensePlate: "" },
    pickupBranchName: pickupBranch?.name ?? "",
    dropoffBranchName: dropoffBranch?.name ?? "",
    pickupDatetime: booking.pickupDatetime,
    dropoffDatetime: booking.dropoffDatetime,
    addons,
    handovers: handoversWithPhotos,
  }
}

// ─── Write: Pickup transaction ────────────────────────────────────────────────

/**
 * Transaction สำหรับ pickup:
 * 1. INSERT handovers (type=pickup)
 * 2. INSERT handover_photos × 4
 * 3. UPDATE bookings → active + actual_pickup_datetime=NOW()
 */
async function insertPickup(input: InsertPickupInput) {
  return db.transaction(async (tx) => {
    const [hv] = await tx
      .insert(handovers)
      .values({
        bookingId: input.bookingId,
        type: "pickup",
        branchId: input.branchId,
        handledBy: input.handledBy,
        actualDatetime: new Date().toISOString(),
        fuelLevel: input.fuelLevel,
        extraCharge: "0",
        damageNote: input.damageNote ?? null,
      })
      .returning()

    const hvId = Number(hv.id)

    await tx.insert(handoverPhotos).values(
      input.photos.map((p) => ({
        handoverId: hvId,
        storagePath: p.storagePath,
        url: p.url,
        angle: p.angle,
      })),
    )

    const now = new Date().toISOString()
    const [updatedBooking] = await tx
      .update(bookings)
      .set({
        status: "active",
        actualPickupDatetime: now,
        updatedAt: now,
      })
      .where(eq(bookings.id, BigInt(input.bookingId)))
      .returning()

    return { handover: { ...hv, id: hvId }, booking: updatedBooking }
  })
}

// ─── Write: Return transaction ────────────────────────────────────────────────

/**
 * Transaction สำหรับ return (Stripe settle ต้องเรียกก่อน transaction นี้):
 * 1. INSERT handovers (type=return)
 * 2. INSERT handover_photos × 4
 * 3. UPDATE bookings → completed + deposit_status + deposit_forfeit_amount
 * 4. UPDATE cars → current_branch_id = dropoff_branch_id
 */
async function insertReturn(input: InsertReturnInput) {
  return db.transaction(async (tx) => {
    const [hv] = await tx
      .insert(handovers)
      .values({
        bookingId: input.bookingId,
        type: "return",
        branchId: input.branchId,
        handledBy: input.handledBy,
        actualDatetime: new Date().toISOString(),
        fuelLevel: input.fuelLevel,
        extraCharge: String(input.extraCharge),
        damageNote: input.damageNote ?? null,
      })
      .returning()

    const hvId = Number(hv.id)

    await tx.insert(handoverPhotos).values(
      input.photos.map((p) => ({
        handoverId: hvId,
        storagePath: p.storagePath,
        url: p.url,
        angle: p.angle,
      })),
    )

    const now = new Date().toISOString()
    const [updatedBooking] = await tx
      .update(bookings)
      .set({
        status: "completed",
        completedAt: now,
        actualDropoffDatetime: now,
        damageCharge: String(input.extraCharge),
        depositStatus: input.depositStatusValue,
        depositForfeitAmount: String(input.forfeitAmount),
        updatedAt: now,
      })
      .where(eq(bookings.id, BigInt(input.bookingId)))
      .returning()

    // รถกลับมาที่สาขาปลายทาง (อัปเดต current location)
    await tx
      .update(cars)
      .set({ currentBranchId: input.dropoffBranchId, updatedAt: now })
      .where(eq(cars.id, BigInt(input.carId)))

    return { handover: { ...hv, id: hvId }, booking: updatedBooking }
  })
}

// ─── Read: Deposit payment for Stripe settle ──────────────────────────────────

async function findDepositPaymentByBookingId(bookingId: number) {
  const { payments } = await import("../db/schema")
  const result = await db
    .select({
      id: payments.id,
      stripePaymentIntentId: payments.stripePaymentIntentId,
      amount: payments.amount,
    })
    .from(payments)
    .where(
      and(eq(payments.bookingId, bookingId), eq(payments.paymentType, "deposit")),
    )
    .limit(1)

  return result[0] ?? null
}

// ─── Read: Branch info ────────────────────────────────────────────────────────

async function findBranchById(branchId: number) {
  const result = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.id, BigInt(branchId)))
    .limit(1)

  return result[0] ?? null
}

export const handoverRepository = {
  findPickupQueue,
  findReturnQueue,
  findBookingDetailForHandover,
  insertPickup,
  insertReturn,
  findDepositPaymentByBookingId,
  findBranchById,
}
